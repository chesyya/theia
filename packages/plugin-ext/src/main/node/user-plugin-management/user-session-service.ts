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
import { Emitter, Event } from '@theia/core/lib/common';

/**
 * 用户会话信息
 */
export interface UserSession {
    sessionId: string;
    userId: string;
    connectedAt: Date;
    isAdmin?: boolean;
}

/**
 * 用户会话事件
 */
export interface UserSessionEvent {
    session: UserSession;
    type: 'connected' | 'disconnected';
}

/**
 * 用户会话服务
 * 
 * 职责：
 * 1. 管理用户会话映射（sessionId -> userId）
 * 2. 跟踪用户连接状态
 * 3. 提供会话相关的用户信息查询
 * 4. 发出用户连接/断开事件
 */
@injectable()
export class UserSessionService {

    @inject(ILogger)
    protected readonly logger: ILogger;

    // 会话ID到用户信息的映射
    private readonly sessionUsers = new Map<string, UserSession>();
    
    // 用户ID到会话ID列表的映射（一个用户可能有多个会话）
    private readonly userSessions = new Map<string, string[]>();

    // 事件发射器
    private readonly onUserSessionChangedEmitter = new Emitter<UserSessionEvent>();
    
    /**
     * 用户会话变化事件
     */
    get onUserSessionChanged(): Event<UserSessionEvent> {
        return this.onUserSessionChangedEmitter.event;
    }

    /**
     * 注册用户会话
     */
    registerUserSession(sessionId: string, userId: string, isAdmin: boolean = false): void {
        const session: UserSession = {
            sessionId,
            userId,
            connectedAt: new Date(),
            isAdmin
        };

        // 更新会话映射
        this.sessionUsers.set(sessionId, session);
        
        // 更新用户会话列表
        let userSessionList = this.userSessions.get(userId);
        if (!userSessionList) {
            userSessionList = [];
            this.userSessions.set(userId, userSessionList);
        }
        userSessionList.push(sessionId);

        this.logger.info(`[USER-SESSION] 注册用户会话: 用户=${userId}, 会话=${sessionId}, 管理员=${isAdmin}`);
        
        // 发出连接事件
        this.onUserSessionChangedEmitter.fire({
            session,
            type: 'connected'
        });
    }

    /**
     * 注销用户会话
     */
    unregisterUserSession(sessionId: string): void {
        const session = this.sessionUsers.get(sessionId);
        if (!session) {
            this.logger.warn(`[USER-SESSION] 尝试注销不存在的会话: ${sessionId}`);
            return;
        }

        const { userId } = session;
        
        // 从会话映射中删除
        this.sessionUsers.delete(sessionId);
        
        // 从用户会话列表中删除
        const userSessionList = this.userSessions.get(userId);
        if (userSessionList) {
            const index = userSessionList.indexOf(sessionId);
            if (index >= 0) {
                userSessionList.splice(index, 1);
            }
            
            // 如果用户没有其他会话了，清除用户映射
            if (userSessionList.length === 0) {
                this.userSessions.delete(userId);
            }
        }

        this.logger.info(`[USER-SESSION] 注销用户会话: 用户=${userId}, 会话=${sessionId}`);
        
        // 发出断开事件
        this.onUserSessionChangedEmitter.fire({
            session,
            type: 'disconnected'
        });
    }

    /**
     * 获取会话对应的用户ID
     */
    getUserForSession(sessionId: string): string | undefined {
        return this.sessionUsers.get(sessionId)?.userId;
    }

    /**
     * 获取会话信息
     */
    getSession(sessionId: string): UserSession | undefined {
        return this.sessionUsers.get(sessionId);
    }

    /**
     * 检查会话是否存在
     */
    hasSession(sessionId: string): boolean {
        return this.sessionUsers.has(sessionId);
    }

    /**
     * 检查用户是否有活跃会话
     */
    hasUserSessions(userId: string): boolean {
        const sessions = this.userSessions.get(userId);
        return sessions !== undefined && sessions.length > 0;
    }

    /**
     * 获取用户的所有会话ID
     */
    getUserSessions(userId: string): string[] {
        return this.userSessions.get(userId) || [];
    }

    /**
     * 获取用户的所有会话详情
     */
    getUserSessionDetails(userId: string): UserSession[] {
        const sessionIds = this.getUserSessions(userId);
        return sessionIds
            .map(id => this.sessionUsers.get(id))
            .filter(session => session !== undefined) as UserSession[];
    }

    /**
     * 检查会话用户是否为管理员
     */
    isSessionAdmin(sessionId: string): boolean {
        return this.sessionUsers.get(sessionId)?.isAdmin || false;
    }

    /**
     * 获取所有活跃用户
     */
    getActiveUsers(): string[] {
        return Array.from(this.userSessions.keys());
    }

    /**
     * 获取所有活跃会话
     */
    getActiveSessions(): UserSession[] {
        return Array.from(this.sessionUsers.values());
    }

    /**
     * 获取会话统计信息
     */
    getSessionStats(): { totalSessions: number; totalUsers: number; adminSessions: number } {
        const sessions = Array.from(this.sessionUsers.values());
        return {
            totalSessions: sessions.length,
            totalUsers: this.userSessions.size,
            adminSessions: sessions.filter(s => s.isAdmin).length
        };
    }

    /**
     * 清理所有会话（用于测试或重启）
     */
    clearAllSessions(): void {
        const sessions = Array.from(this.sessionUsers.values());
        
        // 为每个会话发出断开事件
        sessions.forEach(session => {
            this.onUserSessionChangedEmitter.fire({
                session,
                type: 'disconnected'
            });
        });
        
        this.sessionUsers.clear();
        this.userSessions.clear();
        
        this.logger.info('[USER-SESSION] 已清理所有会话');
    }
}