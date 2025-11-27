// *****************************************************************************
// Copyright (C) 2024 Baosky and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * API 兼容性检查器
 *
 * 用于检查插件使用的 API 是否与当前 IDE 的 @theia/plugin API 兼容
 */

import * as fs from 'fs';
import * as path from 'path';
import { PluginApiMetadata } from './api-extractor-ts-morph';

export interface IdeApiDefinition {
    /** IDE 版本 */
    version: string;
    /** 可用的 API 列表 */
    availableApis: string[];
    /** API 成员详情 */
    apiMembers: Record<string, {
        /** 可用的属性/方法 */
        members: string[];
        /** 是否已废弃 */
        deprecated?: boolean;
        /** 添加的版本 */
        since?: string;
    }>;
}

export interface CompatibilityCheckResult {
    /** 是否兼容 */
    compatible: boolean;
    /** 兼容性级别 */
    level: 'full' | 'partial' | 'incompatible';
    /** 缺失的 API */
    missingApis: string[];
    /** 不兼容的成员 */
    incompatibleMembers: Array<{
        api: string;
        member: string;
        reason: string;
    }>;
    /** 警告信息 */
    warnings: Array<{
        type: 'deprecated' | 'experimental' | 'version';
        message: string;
    }>;
    /** 兼容性分数 (0-100) */
    score: number;
}

/**
 * API 兼容性检查器
 */
export class ApiCompatibilityChecker {
    /**
     * 检查插件 API 兼容性
     */
    checkCompatibility(
        pluginMetadata: PluginApiMetadata,
        ideApiDefinition: IdeApiDefinition
    ): CompatibilityCheckResult {
        const result: CompatibilityCheckResult = {
            compatible: true,
            level: 'full',
            missingApis: [],
            incompatibleMembers: [],
            warnings: [],
            score: 100
        };

        const availableApisSet = new Set(ideApiDefinition.availableApis);

        // 1. 检查顶层 API 是否存在
        for (const api of pluginMetadata.apis) {
            if (!availableApisSet.has(api)) {
                result.missingApis.push(api);
                result.compatible = false;
            }
        }

        // 2. 检查 API 成员是否存在
        for (const [api, details] of Object.entries(pluginMetadata.apiUsageDetails)) {
            const ideApiInfo = ideApiDefinition.apiMembers[api];

            if (!ideApiInfo) {
                continue; // API 本身不存在，已在上面记录
            }

            // 检查废弃警告
            if (ideApiInfo.deprecated) {
                result.warnings.push({
                    type: 'deprecated',
                    message: `API '${api}' is deprecated`
                });
            }

            // 检查成员
            const availableMembersSet = new Set(ideApiInfo.members);

            for (const member of details.members) {
                if (!availableMembersSet.has(member)) {
                    result.incompatibleMembers.push({
                        api,
                        member,
                        reason: `Member '${member}' does not exist on '${api}'`
                    });
                    result.compatible = false;
                }
            }
        }

        // 3. 计算兼容性级别和分数
        const totalApis = pluginMetadata.apis.length;
        const missingCount = result.missingApis.length;
        const incompatibleCount = result.incompatibleMembers.length;

        if (missingCount === 0 && incompatibleCount === 0) {
            result.level = 'full';
            result.score = 100;
        } else if (missingCount / totalApis < 0.3 && incompatibleCount < 5) {
            result.level = 'partial';
            result.score = Math.max(0, 100 - (missingCount * 10 + incompatibleCount * 5));
        } else {
            result.level = 'incompatible';
            result.score = Math.max(0, 50 - (missingCount * 10 + incompatibleCount * 5));
        }

        return result;
    }

    /**
     * 从当前 IDE 环境生成 API 定义
     */
    async generateIdeApiDefinition(theiaPluginPath?: string): Promise<IdeApiDefinition> {
        // 默认路径
        if (!theiaPluginPath) {
            theiaPluginPath = require.resolve('@theia/plugin');
        }

        const packageJsonPath = path.join(path.dirname(theiaPluginPath), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

        // 读取 theia.d.ts 来获取 API 列表
        const dtsPath = path.join(path.dirname(theiaPluginPath), 'theia.d.ts');

        if (!fs.existsSync(dtsPath)) {
            throw new Error(`theia.d.ts not found at ${dtsPath}`);
        }

        const dtsContent = fs.readFileSync(dtsPath, 'utf-8');

        // 简单的正则提取（实际应该用 TypeScript Compiler API）
        const apiMembers: Record<string, { members: string[] }> = {};
        const availableApis: string[] = [];

        // 提取导出的 API
        // 例如: export namespace commands { ... }
        const namespaceRegex = /export\s+(?:declare\s+)?(?:namespace|module|class|interface)\s+(\w+)/g;
        let match;

        while ((match = namespaceRegex.exec(dtsContent)) !== null) {
            const apiName = match[1];
            availableApis.push(apiName);

            // 这里简化处理，实际应该深度解析成员
            apiMembers[apiName] = { members: [] };
        }

        // 提取变量和函数导出
        const exportRegex = /export\s+(?:const|let|var|function)\s+(\w+)/g;
        while ((match = exportRegex.exec(dtsContent)) !== null) {
            const apiName = match[1];
            if (!availableApis.includes(apiName)) {
                availableApis.push(apiName);
                apiMembers[apiName] = { members: [] };
            }
        }

        return {
            version: packageJson.version || 'unknown',
            availableApis: [...new Set(availableApis)].sort(),
            apiMembers
        };
    }

    /**
     * 生成兼容性报告（Markdown 格式）
     */
    generateReport(
        pluginMetadata: PluginApiMetadata,
        result: CompatibilityCheckResult
    ): string {
        const lines: string[] = [];

        lines.push(`# API Compatibility Report`);
        lines.push('');
        lines.push(`**Plugin:** ${pluginMetadata.pluginId} v${pluginMetadata.pluginVersion}`);
        lines.push(`**Compatibility Level:** ${result.level.toUpperCase()}`);
        lines.push(`**Compatibility Score:** ${result.score}/100`);
        lines.push('');

        if (result.compatible) {
            lines.push('✅ **All APIs are compatible!**');
        } else {
            lines.push('❌ **Compatibility issues found:**');
        }

        lines.push('');

        // 缺失的 API
        if (result.missingApis.length > 0) {
            lines.push(`## Missing APIs (${result.missingApis.length})`);
            lines.push('');
            lines.push('The following APIs are used by the plugin but not available in the current IDE:');
            lines.push('');
            for (const api of result.missingApis) {
                lines.push(`- \`${api}\``);
            }
            lines.push('');
        }

        // 不兼容的成员
        if (result.incompatibleMembers.length > 0) {
            lines.push(`## Incompatible Members (${result.incompatibleMembers.length})`);
            lines.push('');
            for (const item of result.incompatibleMembers) {
                lines.push(`- \`${item.api}.${item.member}\`: ${item.reason}`);
            }
            lines.push('');
        }

        // 警告
        if (result.warnings.length > 0) {
            lines.push(`## Warnings (${result.warnings.length})`);
            lines.push('');
            for (const warning of result.warnings) {
                const icon = warning.type === 'deprecated' ? '⚠️' : 'ℹ️';
                lines.push(`${icon} **${warning.type}**: ${warning.message}`);
            }
            lines.push('');
        }

        // API 使用统计
        lines.push('## API Usage Summary');
        lines.push('');
        lines.push(`Total APIs used: ${pluginMetadata.apis.length}`);
        lines.push('');
        lines.push('| API | Import Type | Members | Usage Count | Aliases |');
        lines.push('|-----|-------------|---------|-------------|---------|');

        for (const api of pluginMetadata.apis) {
            const details = pluginMetadata.apiUsageDetails[api];
            const importTypes = details.importTypes.join(', ');
            const members = details.members.length > 0 ? details.members.join(', ') : 'N/A';
            const aliases = details.aliases.length > 0 ? details.aliases.join(', ') : 'N/A';

            lines.push(`| \`${api}\` | ${importTypes} | ${members} | ${details.usageCount} | ${aliases} |`);
        }

        lines.push('');
        lines.push('---');
        lines.push(`*Report generated at ${new Date().toISOString()}*`);

        return lines.join('\n');
    }

    /**
     * 保存 IDE API 定义到文件
     */
    async saveIdeApiDefinition(definition: IdeApiDefinition, outputPath: string): Promise<void> {
        const json = JSON.stringify(definition, null, 2);
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, json, 'utf-8');
    }

    /**
     * 从文件加载 IDE API 定义
     */
    async loadIdeApiDefinition(filePath: string): Promise<IdeApiDefinition> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }
}
