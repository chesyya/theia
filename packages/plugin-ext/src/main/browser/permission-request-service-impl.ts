// *****************************************************************************
// Copyright (C) 2024 EclipseSource and others.
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

import { injectable } from '@theia/core/shared/inversify';
import { AbstractDialog } from '@theia/core/lib/browser/dialogs';
import { Message } from '@theia/core/shared/@phosphor/messaging';
import {
    PermissionRequest,
    PermissionDecision,
    PermissionRequestService,
    PermissionCacheKey,
    PermissionSeverity,
    PermissionRememberScope,
    generateCacheKeyString
} from '../../common/permission-request-service';

/**
 * 带"记住选择"功能的权限请求对话框
 */
class PermissionRequestDialog extends AbstractDialog<PermissionDecision> {
    protected rememberCheckbox: HTMLInputElement;
    protected rememberScopeSelect: HTMLSelectElement;
    protected readonly request: PermissionRequest;

    constructor(request: PermissionRequest) {
        super({
            title: request.title
        });
        this.request = request;
        this.contentNode.appendChild(this.createMessageNode());
        this.appendAcceptButton('允许');
        this.appendCloseButton('拒绝');
    }

    protected override onAfterAttach(msg: Message): void {
        super.onAfterAttach(msg);
    }

    protected createMessageNode(): HTMLElement {
        const messageNode = document.createElement('div');
        messageNode.classList.add('theia-permission-request-dialog');

        // 严重级别指示器
        const severityBadge = document.createElement('div');
        severityBadge.classList.add('permission-severity-badge', `severity-${this.request.severity}`);
        severityBadge.textContent = this.getSeverityLabel(this.request.severity);
        messageNode.appendChild(severityBadge);

        // 插件信息
        const pluginInfo = document.createElement('div');
        pluginInfo.classList.add('permission-plugin-info');
        pluginInfo.innerHTML = `
            <strong>插件:</strong> ${this.escapeHtml(this.request.pluginName)}
            <br>
            <small>${this.escapeHtml(this.request.pluginId)}</small>
        `;
        messageNode.appendChild(pluginInfo);

        // 消息内容
        const messageContent = document.createElement('div');
        messageContent.classList.add('permission-message-content');
        messageContent.innerHTML = this.formatMessage(this.request.message);
        messageNode.appendChild(messageContent);

        // 操作信息
        const operationInfo = document.createElement('div');
        operationInfo.classList.add('permission-operation-info');
        operationInfo.innerHTML = `
            <small>
                <strong>操作:</strong> ${this.escapeHtml(this.request.operationId)}
            </small>
        `;
        messageNode.appendChild(operationInfo);

        // 记住选择选项
        const rememberSection = document.createElement('div');
        rememberSection.classList.add('permission-remember-section');

        // 复选框
        this.rememberCheckbox = document.createElement('input');
        this.rememberCheckbox.type = 'checkbox';
        this.rememberCheckbox.id = 'permission-remember-checkbox';
        this.rememberCheckbox.classList.add('theia-input');

        const checkboxLabel = document.createElement('label');
        checkboxLabel.htmlFor = 'permission-remember-checkbox';
        checkboxLabel.textContent = '记住我的选择';
        checkboxLabel.style.marginLeft = '5px';

        rememberSection.appendChild(this.rememberCheckbox);
        rememberSection.appendChild(checkboxLabel);

        // 记住范围选择
        const scopeContainer = document.createElement('div');
        scopeContainer.classList.add('permission-remember-scope');
        scopeContainer.style.marginTop = '8px';
        scopeContainer.style.marginLeft = '24px';

        const scopeLabel = document.createElement('label');
        scopeLabel.textContent = '记住范围: ';
        scopeLabel.style.marginRight = '5px';

        this.rememberScopeSelect = document.createElement('select');
        this.rememberScopeSelect.classList.add('theia-select');
        this.rememberScopeSelect.disabled = true; // 默认禁用，勾选复选框后启用

        this.rememberScopeSelect.innerHTML = `
            <option value="${PermissionRememberScope.THIS_OPERATION}">仅此操作</option>
            <option value="${PermissionRememberScope.THIS_PLUGIN}">此插件的所有操作</option>
            <option value="${PermissionRememberScope.SESSION_ONLY}">仅当前会话</option>
        `;

        // 复选框状态改变时启用/禁用下拉框
        this.rememberCheckbox.addEventListener('change', () => {
            this.rememberScopeSelect.disabled = !this.rememberCheckbox.checked;
        });

        scopeContainer.appendChild(scopeLabel);
        scopeContainer.appendChild(this.rememberScopeSelect);

        rememberSection.appendChild(scopeContainer);
        messageNode.appendChild(rememberSection);

        return messageNode;
    }

    protected getSeverityLabel(severity: PermissionSeverity): string {
        switch (severity) {
            case PermissionSeverity.INFO:
                return '📘 信息';
            case PermissionSeverity.WARNING:
                return '⚠️ 警告';
            case PermissionSeverity.HIGH:
                return '🔶 高危';
            case PermissionSeverity.CRITICAL:
                return '🔴 严重';
            default:
                return '❓';
        }
    }

    protected formatMessage(message: string): string {
        // 简单的 Markdown 支持（换行、粗体等）
        return this.escapeHtml(message)
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    protected escapeHtml(unsafe: string): string {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    get value(): PermissionDecision {
        // 获取用户的决策
        const allowed = this.resolve !== undefined; // Accept 按钮被点击
        const remember = this.rememberCheckbox.checked;
        const scope = this.rememberScopeSelect.value as PermissionRememberScope;

        return {
            allowed,
            remember,
            rememberScope: remember ? scope : undefined,
            timestamp: Date.now()
        };
    }
}

/**
 * 通用权限请求服务实现
 */
@injectable()
export class PermissionRequestServiceImpl implements PermissionRequestService {
    // 权限缓存：cacheKeyString -> PermissionDecision
    private permissionCache = new Map<string, PermissionDecision>();

    // 正在进行的请求（避免重复弹窗）
    private pendingRequests = new Map<string, Promise<PermissionDecision>>();

    async $requestPermission(request: PermissionRequest): Promise<PermissionDecision> {
        console.log(`[Permission Request] Requesting permission for ${request.pluginId} - ${request.operationId}`);

        // 1. 检查缓存
        const cacheKey: PermissionCacheKey = {
            pluginId: request.pluginId,
            operationId: request.operationId
        };

        const cached = await this.$getCachedPermission(cacheKey);
        if (cached) {
            console.log(`[Permission Request] Using cached decision: ${cached.allowed}`);
            if (!cached.allowed) {
                throw new Error(`Permission denied (cached): ${request.operationId}`);
            }
            return cached;
        }

        // 2. 检查是否有正在进行的请求
        const requestKey = generateCacheKeyString(cacheKey);
        if (this.pendingRequests.has(requestKey)) {
            console.log(`[Permission Request] Waiting for existing request: ${requestKey}`);
            return this.pendingRequests.get(requestKey)!;
        }

        // 3. 创建新的权限请求
        const requestPromise = this.showPermissionDialog(request, cacheKey);
        this.pendingRequests.set(requestKey, requestPromise);

        try {
            const decision = await requestPromise;

            // 4. 根据用户选择缓存决策
            if (decision.remember) {
                await this.cacheDecisionWithScope(cacheKey, decision);
            }

            // 5. 检查结果
            if (!decision.allowed) {
                throw new Error(`Permission denied by user: ${request.operationId}`);
            }

            return decision;
        } finally {
            this.pendingRequests.delete(requestKey);
        }
    }

    private async showPermissionDialog(
        request: PermissionRequest,
        cacheKey: PermissionCacheKey
    ): Promise<PermissionDecision> {
        const dialog = new PermissionRequestDialog(request);
        const result = await dialog.open();

        if (result) {
            // Accept 按钮被点击
            return result;
        } else {
            // Close/拒绝按钮被点击
            // ✅ 修复：读取对话框的 value 以获取用户的完整选择（包括记住选项）
            const decision = dialog.value;
            // 确保 allowed 为 false（因为点击了拒绝）
            return {
                ...decision,
                allowed: false,
                timestamp: Date.now()
            };
        }
    }

    /**
     * 根据记住范围缓存决策
     */
    private async cacheDecisionWithScope(
        cacheKey: PermissionCacheKey,
        decision: PermissionDecision
    ): Promise<void> {
        const scope = decision.rememberScope || PermissionRememberScope.THIS_OPERATION;

        switch (scope) {
            case PermissionRememberScope.THIS_OPERATION:
                // 仅缓存此具体操作
                await this.$cachePermission(cacheKey, decision);
                console.log(`[Permission Request] Cached decision for operation: ${cacheKey.operationId}`);
                break;

            case PermissionRememberScope.THIS_PLUGIN:
                // 缓存此插件的所有操作
                const pluginKey: PermissionCacheKey = {
                    pluginId: cacheKey.pluginId,
                    operationId: '*'
                };
                await this.$cachePermission(pluginKey, decision);
                console.log(`[Permission Request] Cached decision for plugin: ${cacheKey.pluginId}`);
                break;

            case PermissionRememberScope.SESSION_ONLY:
                // 仅会话期间有效（不持久化，但仍然缓存）
                await this.$cachePermission(cacheKey, { ...decision, rememberScope: PermissionRememberScope.SESSION_ONLY });
                console.log(`[Permission Request] Cached decision for session only`);
                break;
        }
    }

    async $getCachedPermission(key: PermissionCacheKey): Promise<PermissionDecision | null> {
        // 精确匹配
        const exactKey = generateCacheKeyString(key);
        if (this.permissionCache.has(exactKey)) {
            return this.permissionCache.get(exactKey)!;
        }

        // 插件通配符匹配
        const pluginWildcardKey = generateCacheKeyString({
            pluginId: key.pluginId,
            operationId: '*'
        });
        if (this.permissionCache.has(pluginWildcardKey)) {
            return this.permissionCache.get(pluginWildcardKey)!;
        }

        return null;
    }

    async $cachePermission(key: PermissionCacheKey, decision: PermissionDecision): Promise<void> {
        const keyString = generateCacheKeyString(key);
        this.permissionCache.set(keyString, decision);
        console.log(`[Permission Request] Cached permission: ${keyString} = ${decision.allowed}`);
    }

    async $clearPluginPermissions(pluginId: string): Promise<void> {
        const keysToDelete: string[] = [];
        this.permissionCache.forEach((_, key) => {
            if (key.startsWith(`${pluginId}:`)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.permissionCache.delete(key));
        console.log(`[Permission Request] Cleared ${keysToDelete.length} permissions for plugin: ${pluginId}`);
    }

    async $getAllPermissions(): Promise<Map<string, PermissionDecision>> {
        return new Map(this.permissionCache);
    }
}
