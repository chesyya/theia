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
 * CLI 工具示例 - 插件 API 兼容性分析
 *
 * 使用方法:
 * node cli-example.js extract <plugin-path> [output.json]
 * node cli-example.js check <plugin-metadata.json> <ide-api-definition.json>
 * node cli-example.js generate-ide-api [output.json]
 */

import * as path from 'path';
import * as fs from 'fs';

// 注意：需要安装 ts-morph
// npm install ts-morph --save-dev

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'extract':
            await extractCommand(args);
            break;

        case 'check':
            await checkCommand(args);
            break;

        case 'generate-ide-api':
            await generateIdeApiCommand(args);
            break;

        case 'help':
        default:
            printHelp();
            break;
    }
}

/**
 * 提取插件 API 使用信息
 */
async function extractCommand(args: string[]): Promise<void> {
    const pluginPath = args[1];
    const outputPath = args[2] || './plugin-api-metadata.json';

    if (!pluginPath) {
        console.error('Error: Plugin path is required');
        console.error('Usage: extract <plugin-path> [output.json]');
        process.exit(1);
    }

    console.log(`📦 Analyzing plugin at: ${pluginPath}`);

    try {
        // 动态导入（避免编译时依赖）
        const { TsMorphApiExtractor } = await import('./api-extractor-ts-morph');

        const extractor = new TsMorphApiExtractor();
        const metadata = await extractor.extractApis(pluginPath);

        console.log(`\n✅ Extraction complete!`);
        console.log(`   APIs found: ${metadata.apis.length}`);
        console.log(`   Files analyzed: ${metadata.analyzedFiles.length}`);

        console.log(`\n📋 Extracted APIs:`);
        for (const api of metadata.apis) {
            const details = metadata.apiUsageDetails[api];
            console.log(`   - ${api} (${details.usageCount} usages)`);
            if (details.members.length > 0) {
                console.log(`     Members: ${details.members.join(', ')}`);
            }
            if (details.aliases.length > 0) {
                console.log(`     Aliases: ${details.aliases.join(', ')}`);
            }
        }

        // 保存到文件
        await extractor.exportToJson(metadata, outputPath);
        console.log(`\n💾 Saved to: ${path.resolve(outputPath)}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

/**
 * 检查插件兼容性
 */
async function checkCommand(args: string[]): Promise<void> {
    const pluginMetadataPath = args[1];
    const ideApiDefPath = args[2];

    if (!pluginMetadataPath || !ideApiDefPath) {
        console.error('Error: Both plugin metadata and IDE API definition paths are required');
        console.error('Usage: check <plugin-metadata.json> <ide-api-definition.json>');
        process.exit(1);
    }

    console.log(`🔍 Checking compatibility...`);
    console.log(`   Plugin metadata: ${pluginMetadataPath}`);
    console.log(`   IDE API definition: ${ideApiDefPath}`);

    try {
        const { ApiCompatibilityChecker } = await import('./api-compatibility-checker');

        // 读取文件
        const pluginMetadata = JSON.parse(fs.readFileSync(pluginMetadataPath, 'utf-8'));
        const ideApiDef = JSON.parse(fs.readFileSync(ideApiDefPath, 'utf-8'));

        const checker = new ApiCompatibilityChecker();
        const result = checker.checkCompatibility(pluginMetadata, ideApiDef);

        console.log(`\n${result.compatible ? '✅' : '❌'} Compatibility Result:`);
        console.log(`   Level: ${result.level.toUpperCase()}`);
        console.log(`   Score: ${result.score}/100`);

        if (result.missingApis.length > 0) {
            console.log(`\n⚠️  Missing APIs (${result.missingApis.length}):`);
            for (const api of result.missingApis) {
                console.log(`   - ${api}`);
            }
        }

        if (result.incompatibleMembers.length > 0) {
            console.log(`\n⚠️  Incompatible Members (${result.incompatibleMembers.length}):`);
            for (const item of result.incompatibleMembers) {
                console.log(`   - ${item.api}.${item.member}: ${item.reason}`);
            }
        }

        if (result.warnings.length > 0) {
            console.log(`\nℹ️  Warnings (${result.warnings.length}):`);
            for (const warning of result.warnings) {
                console.log(`   - [${warning.type}] ${warning.message}`);
            }
        }

        // 生成报告
        const report = checker.generateReport(pluginMetadata, result);
        const reportPath = './compatibility-report.md';
        fs.writeFileSync(reportPath, report, 'utf-8');
        console.log(`\n📄 Full report saved to: ${path.resolve(reportPath)}`);

        // 退出码
        process.exit(result.compatible ? 0 : 1);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

/**
 * 生成当前 IDE 的 API 定义
 */
async function generateIdeApiCommand(args: string[]): Promise<void> {
    const outputPath = args[1] || './ide-api-definition.json';

    console.log(`🔧 Generating IDE API definition...`);

    try {
        const { ApiCompatibilityChecker } = await import('./api-compatibility-checker');

        const checker = new ApiCompatibilityChecker();
        const definition = await checker.generateIdeApiDefinition();

        console.log(`\n✅ Generation complete!`);
        console.log(`   Version: ${definition.version}`);
        console.log(`   Available APIs: ${definition.availableApis.length}`);

        // 保存到文件
        await checker.saveIdeApiDefinition(definition, outputPath);
        console.log(`\n💾 Saved to: ${path.resolve(outputPath)}`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

/**
 * 打印帮助信息
 */
function printHelp(): void {
    console.log(`
📚 Plugin API Compatibility Analyzer

Usage:
  node cli-example.js <command> [options]

Commands:
  extract <plugin-path> [output.json]
    Extract API usage from a plugin

  check <plugin-metadata.json> <ide-api-definition.json>
    Check compatibility between plugin and IDE

  generate-ide-api [output.json]
    Generate IDE API definition from current environment

  help
    Show this help message

Examples:
  # Extract API usage from a plugin
  node cli-example.js extract /path/to/my-plugin plugin-apis.json

  # Generate IDE API definition
  node cli-example.js generate-ide-api ide-apis.json

  # Check compatibility
  node cli-example.js check plugin-apis.json ide-apis.json

Requirements:
  - Node.js >= 14
  - ts-morph: npm install ts-morph --save-dev

For more information, see README.md
`);
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

export { main };
