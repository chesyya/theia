/**
 * Theia 插件 API 方法权限检查器
 *
 * 用于在运行时检查插件是否有权限调用特定的 API 方法
 */

// ==================== 类型定义 ====================

export enum PermissionAction {
    Allow = 'Allow',
    Deny = 'Deny',
    Ask = 'Ask'
}

export interface ApiMethodPermission {
    namespace: string;
    methodName: string;
    allowed: boolean;
    action: PermissionAction;
    maxCallsPerMinute?: number;
    maxCallsPerHour?: number;
    requireUserApproval?: boolean;
    allowedPaths?: string;
    deniedPaths?: string;
    maxFileSize?: number;
    maxEditSize?: number;
    [key: string]: any; // 其他自定义属性
}

export interface GlobalPolicy {
    defaultAction: PermissionAction;
    allowUnlistedApis: boolean;
    logAllCalls: boolean;
}

export interface PluginPermissionConfig {
    pluginId: string;
    globalPolicy: GlobalPolicy;
    apiMethods: Map<string, ApiMethodPermission>; // key: "namespace.methodName"
}

export interface ApiCallRecord {
    pluginId: string;
    apiFullName: string;
    timestamp: number;
    allowed: boolean;
    denyReason?: string;
}

// ==================== 权限检查器 ====================

export class ApiPermissionChecker {
    private configs: Map<string, PluginPermissionConfig> = new Map();
    private callHistory: Map<string, ApiCallRecord[]> = new Map(); // key: pluginId
    private userApprovalCache: Map<string, boolean> = new Map(); // key: "pluginId:apiName"

    /**
     * 加载插件权限配置
     */
    loadConfig(config: PluginPermissionConfig): void {
        this.configs.set(config.pluginId, config);
    }

    /**
     * 检查 API 调用权限
     */
    async checkPermission(
        pluginId: string,
        namespace: string,
        methodName: string,
        args?: any[]
    ): Promise<{ allowed: boolean; reason?: string }> {
        const apiFullName = `${namespace}.${methodName}`;

        // 1. 获取插件配置
        const config = this.configs.get(pluginId);
        if (!config) {
            return this.deny(pluginId, apiFullName, 'Plugin config not found');
        }

        // 2. 获取 API 方法权限配置
        const apiPermission = config.apiMethods.get(apiFullName);

        // 3. 如果未配置，使用全局默认策略
        if (!apiPermission) {
            return this.handleUnlistedApi(pluginId, apiFullName, config.globalPolicy);
        }

        // 4. 检查是否明确禁止
        if (!apiPermission.allowed || apiPermission.action === PermissionAction.Deny) {
            return this.deny(pluginId, apiFullName, 'API explicitly denied');
        }

        // 5. 检查频率限制
        const rateLimitCheck = this.checkRateLimit(pluginId, apiFullName, apiPermission);
        if (!rateLimitCheck.allowed) {
            return rateLimitCheck;
        }

        // 6. 检查参数限制（文件路径、大小等）
        const paramCheck = this.checkParameters(apiFullName, apiPermission, args);
        if (!paramCheck.allowed) {
            return paramCheck;
        }

        // 7. 检查是否需要用户批准
        if (apiPermission.action === PermissionAction.Ask || apiPermission.requireUserApproval) {
            const approved = await this.requestUserApproval(pluginId, apiFullName, apiPermission);
            if (!approved) {
                return this.deny(pluginId, apiFullName, 'User denied permission');
            }
        }

        // 8. 记录调用
        this.recordCall(pluginId, apiFullName, true);

        // 9. 记录日志
        if (config.globalPolicy.logAllCalls) {
            console.log(`[API Permission] ALLOWED: ${pluginId} -> ${apiFullName}`);
        }

        return { allowed: true };
    }

    /**
     * 处理未配置的 API
     */
    private handleUnlistedApi(
        pluginId: string,
        apiFullName: string,
        policy: GlobalPolicy
    ): { allowed: boolean; reason?: string } {
        if (!policy.allowUnlistedApis) {
            return this.deny(pluginId, apiFullName, 'API not in whitelist');
        }

        switch (policy.defaultAction) {
            case PermissionAction.Allow:
                this.recordCall(pluginId, apiFullName, true);
                return { allowed: true };

            case PermissionAction.Deny:
                return this.deny(pluginId, apiFullName, 'Default action is Deny');

            case PermissionAction.Ask:
                // 在实际实现中应该异步请求用户
                return this.deny(pluginId, apiFullName, 'User approval required but not implemented');
        }
    }

    /**
     * 检查频率限制
     */
    private checkRateLimit(
        pluginId: string,
        apiFullName: string,
        permission: ApiMethodPermission
    ): { allowed: boolean; reason?: string } {
        const now = Date.now();
        const history = this.callHistory.get(pluginId) || [];

        // 检查每分钟限制
        if (permission.maxCallsPerMinute) {
            const oneMinuteAgo = now - 60 * 1000;
            const recentCalls = history.filter(
                record => record.apiFullName === apiFullName &&
                         record.timestamp > oneMinuteAgo &&
                         record.allowed
            );

            if (recentCalls.length >= permission.maxCallsPerMinute) {
                return this.deny(
                    pluginId,
                    apiFullName,
                    `Rate limit exceeded: ${permission.maxCallsPerMinute} calls/minute`
                );
            }
        }

        // 检查每小时限制
        if (permission.maxCallsPerHour) {
            const oneHourAgo = now - 60 * 60 * 1000;
            const recentCalls = history.filter(
                record => record.apiFullName === apiFullName &&
                         record.timestamp > oneHourAgo &&
                         record.allowed
            );

            if (recentCalls.length >= permission.maxCallsPerHour) {
                return this.deny(
                    pluginId,
                    apiFullName,
                    `Rate limit exceeded: ${permission.maxCallsPerHour} calls/hour`
                );
            }
        }

        return { allowed: true };
    }

    /**
     * 检查参数限制
     */
    private checkParameters(
        apiFullName: string,
        permission: ApiMethodPermission,
        args?: any[]
    ): { allowed: boolean; reason?: string } {
        if (!args || args.length === 0) {
            return { allowed: true };
        }

        // 针对文件系统 API 检查路径
        if (apiFullName.startsWith('workspace.')) {
            return this.checkFileSystemParams(apiFullName, permission, args);
        }

        // 针对 UI API 检查消息长度
        if (apiFullName.startsWith('window.show')) {
            return this.checkMessageParams(apiFullName, permission, args);
        }

        return { allowed: true };
    }

    /**
     * 检查文件系统相关参数
     */
    private checkFileSystemParams(
        apiFullName: string,
        permission: ApiMethodPermission,
        args: any[]
    ): { allowed: boolean; reason?: string } {
        // 简化实现：检查第一个参数是否为 URI
        const uriArg = args[0];
        if (uriArg && typeof uriArg === 'object' && uriArg.fsPath) {
            const filePath = uriArg.fsPath;

            // 检查禁止路径
            if (permission.deniedPaths) {
                const deniedPatterns = permission.deniedPaths.split(',');
                if (this.matchesAnyPattern(filePath, deniedPatterns)) {
                    return {
                        allowed: false,
                        reason: `File path matches denied pattern: ${filePath}`
                    };
                }
            }

            // 检查允许路径
            if (permission.allowedPaths && permission.allowedPaths !== '**/*') {
                const allowedPatterns = permission.allowedPaths.split(',');
                if (!this.matchesAnyPattern(filePath, allowedPatterns)) {
                    return {
                        allowed: false,
                        reason: `File path not in allowed patterns: ${filePath}`
                    };
                }
            }
        }

        return { allowed: true };
    }

    /**
     * 检查消息相关参数
     */
    private checkMessageParams(
        apiFullName: string,
        permission: ApiMethodPermission,
        args: any[]
    ): { allowed: boolean; reason?: string } {
        const message = args[0];
        if (typeof message === 'string') {
            // 检查消息长度
            if (permission.maxMessageLength && message.length > permission.maxMessageLength) {
                return {
                    allowed: false,
                    reason: `Message too long: ${message.length} > ${permission.maxMessageLength}`
                };
            }
        }

        // 检查按钮数量
        if (permission.maxButtonCount) {
            const buttons = args.slice(1).filter(arg => typeof arg === 'string' || (arg && arg.title));
            if (buttons.length > permission.maxButtonCount) {
                return {
                    allowed: false,
                    reason: `Too many buttons: ${buttons.length} > ${permission.maxButtonCount}`
                };
            }
        }

        // 检查是否允许模态对话框
        const optionsArg = args.find(arg => arg && typeof arg === 'object' && 'modal' in arg);
        if (optionsArg && optionsArg.modal && !permission.allowModalOption) {
            return {
                allowed: false,
                reason: 'Modal dialogs not allowed'
            };
        }

        return { allowed: true };
    }

    /**
     * 简单的 glob 模式匹配（实际应使用 micromatch 等库）
     */
    private matchesAnyPattern(path: string, patterns: string[]): boolean {
        return patterns.some(pattern => {
            // 简化实现
            const regex = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.');
            return new RegExp(`^${regex}$`).test(path);
        });
    }

    /**
     * 请求用户批准（实际需要与 UI 集成）
     */
    private async requestUserApproval(
        pluginId: string,
        apiFullName: string,
        permission: ApiMethodPermission
    ): Promise<boolean> {
        const cacheKey = `${pluginId}:${apiFullName}`;

        // 检查缓存
        if (this.userApprovalCache.has(cacheKey)) {
            return this.userApprovalCache.get(cacheKey)!;
        }

        // 实际实现中应该显示对话框请求用户批准
        // 这里简化为自动批准（仅用于演示）
        console.log(`[API Permission] Requesting user approval for ${pluginId} -> ${apiFullName}`);

        // 模拟用户批准
        const approved = true; // 应该从 UI 获取

        // 缓存结果（可选：设置过期时间）
        this.userApprovalCache.set(cacheKey, approved);

        return approved;
    }

    /**
     * 记录 API 调用
     */
    private recordCall(pluginId: string, apiFullName: string, allowed: boolean, reason?: string): void {
        const record: ApiCallRecord = {
            pluginId,
            apiFullName,
            timestamp: Date.now(),
            allowed,
            denyReason: reason
        };

        const history = this.callHistory.get(pluginId) || [];
        history.push(record);

        // 保留最近 1000 条记录
        if (history.length > 1000) {
            history.shift();
        }

        this.callHistory.set(pluginId, history);
    }

    /**
     * 拒绝访问
     */
    private deny(pluginId: string, apiFullName: string, reason: string): { allowed: false; reason: string } {
        this.recordCall(pluginId, apiFullName, false, reason);
        console.warn(`[API Permission] DENIED: ${pluginId} -> ${apiFullName}: ${reason}`);
        return { allowed: false, reason };
    }

    /**
     * 获取插件的调用历史
     */
    getCallHistory(pluginId: string): ApiCallRecord[] {
        return this.callHistory.get(pluginId) || [];
    }

    /**
     * 获取统计信息
     */
    getStatistics(pluginId: string): {
        totalCalls: number;
        allowedCalls: number;
        deniedCalls: number;
        topApis: Array<{ api: string; count: number }>;
    } {
        const history = this.callHistory.get(pluginId) || [];
        const allowedCalls = history.filter(r => r.allowed).length;
        const deniedCalls = history.length - allowedCalls;

        // 统计每个 API 的调用次数
        const apiCounts = new Map<string, number>();
        history.forEach(record => {
            const count = apiCounts.get(record.apiFullName) || 0;
            apiCounts.set(record.apiFullName, count + 1);
        });

        const topApis = Array.from(apiCounts.entries())
            .map(([api, count]) => ({ api, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalCalls: history.length,
            allowedCalls,
            deniedCalls,
            topApis
        };
    }

    /**
     * 清除缓存
     */
    clearCache(pluginId?: string): void {
        if (pluginId) {
            // 清除特定插件的缓存
            this.callHistory.delete(pluginId);

            // 清除用户批准缓存
            Array.from(this.userApprovalCache.keys())
                .filter(key => key.startsWith(`${pluginId}:`))
                .forEach(key => this.userApprovalCache.delete(key));
        } else {
            // 清除所有缓存
            this.callHistory.clear();
            this.userApprovalCache.clear();
        }
    }
}

// ==================== 使用示例 ====================

export async function exampleUsage() {
    const checker = new ApiPermissionChecker();

    // 1. 加载配置
    const config: PluginPermissionConfig = {
        pluginId: 'my.test-plugin',
        globalPolicy: {
            defaultAction: PermissionAction.Deny,
            allowUnlistedApis: false,
            logAllCalls: true
        },
        apiMethods: new Map([
            ['window.showInformationMessage', {
                namespace: 'window',
                methodName: 'showInformationMessage',
                allowed: true,
                action: PermissionAction.Allow,
                maxCallsPerMinute: 10,
                maxMessageLength: 500,
                maxButtonCount: 3
            }],
            ['workspace.openTextDocument', {
                namespace: 'workspace',
                methodName: 'openTextDocument',
                allowed: true,
                action: PermissionAction.Allow,
                deniedPaths: '**/.env,**/.git/**',
                maxFileSize: 10485760 // 10MB
            }],
            ['workspace.applyEdit', {
                namespace: 'workspace',
                methodName: 'applyEdit',
                allowed: true,
                action: PermissionAction.Ask,
                requireUserApproval: true,
                maxEditSize: 100000
            }]
        ])
    };

    checker.loadConfig(config);

    // 2. 检查权限
    const result1 = await checker.checkPermission(
        'my.test-plugin',
        'window',
        'showInformationMessage',
        ['Hello World']
    );
    console.log('showInformationMessage:', result1);

    const result2 = await checker.checkPermission(
        'my.test-plugin',
        'workspace',
        'openTextDocument',
        [{ fsPath: '/path/to/file.ts' }]
    );
    console.log('openTextDocument:', result2);

    const result3 = await checker.checkPermission(
        'my.test-plugin',
        'window',
        'createTerminal'
    );
    console.log('createTerminal (not configured):', result3);

    // 3. 获取统计信息
    const stats = checker.getStatistics('my.test-plugin');
    console.log('Statistics:', stats);
}

// ==================== 导出 ====================

export default ApiPermissionChecker;
