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

import URI from '@theia/core/lib/common/uri';

export type FileSystemOperation = 'read' | 'write' | 'delete' | 'stat' | 'mkdir' | 'rename' | 'copy' | 'readdir';

/**
 * Context information for file system permission checks.
 */
export interface FileSystemPermissionContext {
    /**
     * The ID of the plugin requesting access (e.g., 'publisher.plugin-name')
     */
    pluginId?: string;

    /**
     * Additional metadata about the plugin
     */
    pluginMetadata?: {
        version?: string;
        displayName?: string;
        isBuiltin?: boolean;
    };
}

/**
 * Common interface for file system permission checking.
 * Can be implemented differently for browser and node environments.
 */
export interface FileSystemPermissionChecker {
    /**
     * Check if a file system operation is allowed.
     * @param operation The type of operation
     * @param uri The URI being accessed
     * @param context Context information including plugin ID
     * @throws Error if the operation is not permitted
     */
    checkPermission(operation: FileSystemOperation, uri: URI, context?: FileSystemPermissionContext): Promise<void>;

    /**
     * Check if a path is allowed (synchronous version for Node.js fs interception).
     * @param uri The URI to check
     * @param context Context information including plugin ID
     * @returns true if allowed, false otherwise
     */
    isPathAllowed(uri: URI, context?: FileSystemPermissionContext): boolean;
}

/**
 * Base implementation of file system permission checker.
 */
export abstract class BaseFileSystemPermissionService implements FileSystemPermissionChecker {

    async checkPermission(operation: FileSystemOperation, uri: URI, context?: FileSystemPermissionContext): Promise<void> {
        const pluginInfo = context?.pluginId ? `Plugin: ${context.pluginId}` : 'Unknown plugin';
        console.log(`[FileSystem Permission] ${pluginInfo} - Operation: ${operation}, URI: ${uri.toString()}`);

        // Check plugin-specific permissions first
        if (!this.isPluginAllowedOperation(operation, context)) {
            throw this.createPermissionError(
                operation,
                uri,
                `Plugin ${context?.pluginId || 'unknown'} does not have permission for ${operation} operations`
            );
        }

        // Check if path is allowed for this plugin
        if (!this.isPathAllowed(uri, context)) {
            throw this.createPermissionError(operation, uri, 'Path access denied by security policy');
        }

        // Check operation-specific restrictions
        switch (operation) {
            case 'write':
            case 'delete':
                if (this.isSystemCriticalPath(uri)) {
                    throw this.createPermissionError(operation, uri, 'Cannot modify system-critical files');
                }
                break;
        }

        this.logOperation(operation, uri, context);
    }

    isPathAllowed(uri: URI, context?: FileSystemPermissionContext): boolean {
        const path = uri.path.toString();

        // Check plugin-specific path restrictions
        const pluginAllowedPaths = this.getPluginAllowedPaths(context?.pluginId);
        if (pluginAllowedPaths && pluginAllowedPaths.length > 0) {
            const isInAllowedPath = pluginAllowedPaths.some(allowedPath => path.startsWith(allowedPath));
            if (!isInAllowedPath) {
                return false;
            }
        }

        // Global forbidden paths (applies to all plugins)
        const forbiddenPaths = [
            '/etc/shadow',
            '/etc/passwd',
            '/proc',
            '/sys'
        ];

        for (const forbidden of forbiddenPaths) {
            if (path.startsWith(forbidden)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a plugin is allowed to perform a specific operation.
     * Override this method to implement plugin-specific operation permissions.
     *
     * @param operation The operation to check
     * @param context Plugin context information
     * @returns true if allowed, false otherwise
     */
    protected isPluginAllowedOperation(operation: FileSystemOperation, context?: FileSystemPermissionContext): boolean {
        if (!context?.pluginId) {
            // If no plugin ID, apply default policy (can be changed to false for stricter control)
            return true;
        }

        // Example: Built-in plugins have all permissions
        if (context.pluginMetadata?.isBuiltin) {
            return true;
        }

        // TODO: Implement your plugin-specific permission logic here
        // Example implementation:
        /*
        const permissions = this.getPluginPermissions(context.pluginId);
        return permissions.includes(operation);
        */

        // Default: allow all operations (can be changed based on your security requirements)
        return true;
    }

    /**
     * Get allowed paths for a specific plugin.
     * Override this method to implement plugin-specific path restrictions.
     *
     * @param pluginId The plugin ID
     * @returns Array of allowed path prefixes, or null/empty for no restrictions
     */
    protected getPluginAllowedPaths(pluginId?: string): string[] | null {
        if (!pluginId) {
            return null;
        }

        // TODO: Implement your plugin-specific path restrictions here
        // Example implementation:
        /*
        const pluginConfig = this.getPluginConfig(pluginId);
        return pluginConfig.allowedPaths;
        */

        // Example: Restrict certain plugins to specific directories
        /*
        switch (pluginId) {
            case 'untrusted.plugin':
                return ['/tmp', '/workspace'];
            case 'trusted.plugin':
                return null; // No restrictions
            default:
                return ['/workspace', '/home']; // Default restriction
        }
        */

        // Default: no plugin-specific path restrictions
        return null;
    }

    protected isSystemCriticalPath(uri: URI): boolean {
        const path = uri.path.toString();
        const criticalPatterns = [
            '/boot',
            '/etc/fstab',
            '/etc/hosts'
        ];

        return criticalPatterns.some(pattern => path.startsWith(pattern));
    }

    protected logOperation(operation: FileSystemOperation, uri: URI, context?: FileSystemPermissionContext): void {
        const timestamp = new Date().toISOString();
        const pluginInfo = context?.pluginId ? `, Plugin: ${context.pluginId}` : '';
        console.log(`[FileSystem Audit] ${timestamp} - ${operation} on ${uri.toString()}${pluginInfo}`);

        // TODO: Send to audit logging service
        // this.auditLogger.log({ timestamp, operation, uri: uri.toString(), pluginId: context?.pluginId });
    }

    protected createPermissionError(operation: FileSystemOperation, uri: URI, reason: string): Error {
        const error = new Error(`Permission denied: Cannot ${operation} ${uri.toString()} - ${reason}`);
        error.name = 'FileSystemPermissionError';
        return error;
    }
}
