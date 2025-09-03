// *****************************************************************************
// Copyright (C) 2024 TypeFox and others.
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

import { injectable, inject } from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { WsRequestValidatorContribution } from '@theia/core/lib/node/ws-request-validators';
import { UserSessionService } from './user-session-service';
import { BaoskyConfigService } from '../../common/baosky-config-service';
import { ServerModel } from './server';
import * as ws from 'ws';

/**
 * WebSocket会话处理器
 * 
 * 职责：
 * 1. 监听WebSocket连接建立和断开
 * 2. 从请求中提取用户信息
 * 3. 注册/注销用户会话
 * 4. 集成到Theia的WebSocket验证系统
 */
@injectable()
export class WebSocketSessionHandler implements WsRequestValidatorContribution {

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(UserSessionService)
    protected readonly sessionService: UserSessionService;

    @inject(BaoskyConfigService)
    protected readonly configService: BaoskyConfigService;

    @inject(ServerModel)
    protected readonly serverModel: ServerModel;

    // 连接到会话的映射
    private readonly connectionSessions = new Map<ws.WebSocket, string>();

    /**
     * WebSocket请求验证器
     */
    allowWsUpgrade(request: any): Promise<boolean> {
        // 这里可以添加额外的WebSocket升级验证逻辑
        return Promise.resolve(true);
    }

    /**
     * 处理WebSocket连接
     */
    async handleConnection(socket: ws.WebSocket, request: any): Promise<void> {
        const sessionId = this.generateSessionId();
        const userId = await this.extractUserId(request);
        const isAdmin = await this.checkIsAdmin(userId);

        this.logger.info(`[WS-SESSION-HANDLER] WebSocket连接建立: 会话=${sessionId}, 用户=${userId}, 管理员=${isAdmin}`);

        try {
            // 注册用户会话
            this.sessionService.registerUserSession(sessionId, userId, isAdmin);
            
            // 保存连接会话映射
            this.connectionSessions.set(socket, sessionId);

            // 监听连接断开
            socket.on('close', () => {
                this.handleDisconnection(socket, sessionId);
            });

            socket.on('error', (error) => {
                this.logger.error(`[WS-SESSION-HANDLER] WebSocket连接错误: 会话=${sessionId}`, error);
                this.handleDisconnection(socket, sessionId);
            });

        } catch (error) {
            this.logger.error(`[WS-SESSION-HANDLER] 处理WebSocket连接失败: 用户=${userId}`, error);
        }
    }

    /**
     * 处理WebSocket连接断开
     */
    private handleDisconnection(socket: ws.WebSocket, sessionId: string): void {
        this.logger.info(`[WS-SESSION-HANDLER] WebSocket连接断开: 会话=${sessionId}`);

        try {
            // 注销用户会话
            this.sessionService.unregisterUserSession(sessionId);
            
            // 清除连接映射
            this.connectionSessions.delete(socket);

        } catch (error) {
            this.logger.error(`[WS-SESSION-HANDLER] 处理WebSocket断开失败: 会话=${sessionId}`, error);
        }
    }

    /**
     * 从请求中提取用户ID
     */
    private async extractUserId(request: any): Promise<string> {
        // 方法1: 从查询参数中获取
        if (request.url) {
            const url = new URL(request.url, 'http://localhost');
            const userIdParam = url.searchParams.get('userId');
            if (userIdParam) {
                return userIdParam;
            }
        }

        // 方法2: 从请求头中获取
        if (request.headers && request.headers['x-user-id']) {
            return request.headers['x-user-id'];
        }

        // 方法3: 从Cookie中获取
        if (request.headers && request.headers.cookie) {
            const cookies = this.parseCookies(request.headers.cookie);
            if (cookies['theia-user-id']) {
                return cookies['theia-user-id'];
            }
        }

        // 方法4: 从环境变量获取（fallback）
        const envUser = process.env.THEIA_CURRENT_USER;
        if (envUser) {
            return envUser;
        }

        // 方法5: 使用服务器模型的用户（最终fallback）
        return this.serverModel.getCurrentUser();
    }

    /**
     * 检查用户是否为管理员
     */
    private async checkIsAdmin(userId: string): Promise<boolean> {
        try {
            // 方法1: 通过配置服务检查
            return await this.configService.isAdminUser(userId);
        } catch (error) {
            // Fallback: 使用服务器模型
            this.logger.debug(`[WS-SESSION-HANDLER] 无法通过配置服务检查管理员权限，使用服务器模型: ${userId}`);
            return this.serverModel.isAdmin() && this.serverModel.getCurrentUser() === userId;
        }
    }

    /**
     * 解析Cookie字符串
     */
    private parseCookies(cookieString: string): Record<string, string> {
        const cookies: Record<string, string> = {};
        
        cookieString.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                cookies[name] = decodeURIComponent(value);
            }
        });

        return cookies;
    }

    /**
     * 生成会话ID
     */
    private generateSessionId(): string {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取连接对应的会话ID
     */
    getSessionId(socket: ws.WebSocket): string | undefined {
        return this.connectionSessions.get(socket);
    }

    /**
     * 获取所有活跃连接数量
     */
    getActiveConnectionsCount(): number {
        return this.connectionSessions.size;
    }

    /**
     * 清理所有连接会话映射（用于测试或重启）
     */
    clearAllConnections(): void {
        this.connectionSessions.clear();
        this.logger.info('[WS-SESSION-HANDLER] 已清理所有连接会话映射');
    }
}