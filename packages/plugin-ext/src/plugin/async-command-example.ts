// *****************************************************************************
// Copyright (C) 2024 and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************

/**
 * Example of how to use the new async command visibility features in a plugin.
 *
 * This example shows a plugin command that has different visibility based on:
 * 1. The selected file type in the navigator
 * 2. The current workspace state
 * 3. Async API calls to external services
 */

import * as theia from '@theia/plugin';

export function activate(context: theia.PluginContext) {

    // Example 1: Command that shows only for specific file types
    const fileTypeCommand = theia.commands.registerCommand(
        { id: 'myPlugin.processImageFile' },
        {
            execute: (uri: theia.Uri) => {
                theia.window.showInformationMessage(`Processing image: ${uri.path}`);
            },

            // Async visibility check - only show for image files
            isVisible: async (uri: theia.Uri) => {
                if (!uri) return false;

                // Check file extension
                const path = uri.path.toLowerCase();
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
                const isImageFile = imageExtensions.some(ext => path.endsWith(ext));

                if (!isImageFile) return false;

                // Additional async check - maybe verify file exists or check file size
                try {
                    const stat = await theia.workspace.fs.stat(uri);
                    // Only show for files smaller than 10MB
                    return stat.size < 10 * 1024 * 1024;
                } catch {
                    return false;
                }
            }
        }
    );

    // Example 2: Command that checks server availability before showing
    const serverDependentCommand = theia.commands.registerCommand(
        { id: 'myPlugin.uploadToServer' },
        {
            execute: () => {
                theia.window.showInformationMessage('Uploading to server...');
            },

            // Async visibility check - only show if server is available
            isVisible: async () => {
                try {
                    // Simulate async server check with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);

                    const response = await fetch('https://api.example.com/health', {
                        signal: controller.signal,
                        method: 'HEAD'
                    });

                    clearTimeout(timeoutId);
                    return response.ok;
                } catch {
                    // Server not available or timeout
                    return false;
                }
            }
        }
    );

    // Example 3: Context-dependent command for Git repositories
    const gitCommand = theia.commands.registerCommand(
        { id: 'myPlugin.gitOperation' },
        {
            execute: (uri: theia.Uri) => {
                theia.window.showInformationMessage(`Git operation on: ${uri.path}`);
            },

            // Async visibility check - only show in Git repositories with clean working tree
            isVisible: async (uri: theia.Uri) => {
                if (!uri) return false;

                try {
                    // Check if we're in a git repository
                    const gitExtension = theia.extensions.getExtension('vscode.git');
                    if (!gitExtension) return false;

                    // Use git API to check repository status
                    const git = gitExtension.exports.getAPI(1);
                    const repo = git.getRepository(uri);

                    if (!repo) return false;

                    // Check if working tree is clean
                    const status = await repo.status();
                    return status.length === 0; // Only show if no pending changes
                } catch {
                    return false;
                }
            }
        }
    );

    context.subscriptions.push(fileTypeCommand, serverDependentCommand, gitCommand);

    // Register these commands with the navigator's async toolbar
    // Note: This would typically be done in a contribution point or through the main process
    // The commands above would be registered in the plugin host, and the main process
    // would use AsyncCommandRegistry.isVisibleAsync() to check visibility
}

/**
 * How to use in navigator contribution (in main process):
 *
 * Since we've modified core to support async commands natively,
 * you can now use the standard registerMoreToolbarItem method,
 * and it will automatically support async visibility checks!
 *
 * // In your navigator contribution or plugin contribution handler:
 * navigator.registerMoreToolbarItemAsync({
 *   command: 'myPlugin.processImageFile',
 *   text: 'Process Image',
 *   iconClass: 'fa fa-image',
 *   priority: 10
 * });
 *
 * navigator.registerMoreToolbarItemAsync({
 *   command: 'myPlugin.uploadToServer',
 *   text: 'Upload',
 *   iconClass: 'fa fa-upload',
 *   priority: 20
 * });
 *
 * navigator.registerMoreToolbarItemAsync({
 *   command: 'myPlugin.gitOperation',
 *   text: 'Git Action',
 *   iconClass: 'fa fa-git',
 *   priority: 30
 * });
 */

/**
 * How the async visibility works now:
 *
 * 1. User right-clicks on a file in the navigator
 * 2. UI calls CommandRegistry.isVisibleAsync() for context menu items
 * 3. Core CommandRegistry prioritizes async handlers and calls isVisibleAsync()
 * 4. Plugin system bridges to plugin's isVisible() function with the file URI as context
 * 5. Plugin can make async calls to check file type, server status, etc.
 * 6. UI renders menu items based on the async results
 * 7. If any async check fails/times out, the item is hidden
 *
 * Benefits:
 * - Commands can show/hide based on real-time context (SOLVED your original problem!)
 * - Supports async operations (API calls, file system checks, etc.)
 * - Backward compatible - existing sync commands still work unchanged
 * - Graceful fallback if async operations fail
 * - No separate registry needed - core CommandRegistry handles everything
 * - Menu adapters automatically use async when available
 */

/**
 * Key changes made to support this:
 *
 * 1. CommandHandler interface now has isVisibleAsync, isEnabledAsync, isToggledAsync
 * 2. CommandRegistry has async versions of all core methods:
 *    - getVisibleHandlerAsync()
 *    - getActiveHandlerAsync()
 *    - isVisibleAsync()
 *    - isEnabledAsync()
 * 3. MenuCommandExecutor supports async methods
 * 4. Plugin system correctly bridges async calls
 * 5. Navigator has registerMoreToolbarItemAsync() for explicit async support
 */