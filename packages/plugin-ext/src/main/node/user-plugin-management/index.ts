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

/**
 * 用户插件管理模块
 * 
 * 这个模块提供了用户作用域的插件管理功能，包括：
 * 1. 用户插件清理服务 - 监听用户删除事件并清理相关插件资源
 * 2. 用户插件安装服务 - 支持管理员选择安装位置（个人/共享）
 * 3. 用户插件环境服务 - 管理用户作用域的插件目录结构
 */

export { UserPluginCleanupService } from './user-plugin-cleanup-service';
export { 
    UserPluginInstallationService, 
    PluginInstallLocation,
    PluginInstallRequest,
    PluginInstallResult 
} from './user-plugin-installation-service';
export { UserPluginDirectoryResolver } from './user-plugin-directory-resolver';
export { UserPluginDeployerParticipant } from './user-plugin-deployer-participant';

// 新增会话管理相关服务
export { 
    UserSessionService, 
    UserSession, 
    UserSessionEvent 
} from './user-session-service';
export { 
    UserSessionPluginManager, 
    SessionPluginState 
} from './user-session-plugin-manager';
export { 
    SessionAwarePluginService,
    PluginQueryOptions,
    PluginExecutionContext,
    PluginExecutionResult
} from './session-aware-plugin-service';

// WebSocket会话处理器
export { WebSocketSessionHandler } from './websocket-session-handler';