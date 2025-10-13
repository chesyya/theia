# Plugin File System Permissions Configuration Example

This document demonstrates how to implement plugin-specific file system permissions in Theia by extending the base permission service.

## Architecture Overview

The file system permission system has three layers:

1. **Common Base** (`common/file-system-permission-service.ts`): Defines the interface and base implementation
2. **Browser Implementation** (`main/browser/file-system-permission-service.ts`): Used for VS Code API calls
3. **Node Implementation** (`hosted/node/file-system-permission-service-node.ts`): Used for direct fs module interception

## Example: Implementing Plugin-Specific Permissions

### Step 1: Define Permission Configuration

Create a configuration structure for plugin permissions:

```typescript
// Example permission configuration
interface PluginPermissionConfig {
    operations: FileSystemOperation[];  // Allowed operations
    allowedPaths?: string[];           // Restricted paths (null = no restrictions)
}

const PLUGIN_PERMISSIONS: Map<string, PluginPermissionConfig> = new Map([
    // Trusted built-in plugins have full access
    ['vscode.git', {
        operations: ['read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'],
        allowedPaths: null  // No restrictions
    }],

    // Third-party plugin with limited access
    ['publisher.untrusted-plugin', {
        operations: ['read', 'stat', 'readdir'],  // Read-only
        allowedPaths: ['/workspace', '/tmp']      // Limited to workspace and temp
    }],

    // Plugin that can only access its own storage
    ['publisher.sandboxed-plugin', {
        operations: ['read', 'write', 'stat', 'mkdir', 'readdir'],
        allowedPaths: ['/home/.theia/plugins/publisher.sandboxed-plugin']
    }]
]);
```

### Step 2: Extend the Node Permission Service

```typescript
// packages/plugin-ext/src/hosted/node/file-system-permission-service-node.ts

import { injectable } from '@theia/core/shared/inversify';
import { BaseFileSystemPermissionService, FileSystemOperation, FileSystemPermissionContext } from '../../common/file-system-permission-service';

@injectable()
export class FileSystemPermissionServiceNode extends BaseFileSystemPermissionService {

    /**
     * Override to implement plugin-specific operation permissions.
     */
    protected isPluginAllowedOperation(operation: FileSystemOperation, context?: FileSystemPermissionContext): boolean {
        if (!context?.pluginId) {
            // No plugin ID: apply default policy
            // Change to 'false' for stricter control
            return true;
        }

        // Built-in plugins have all permissions
        if (context.pluginMetadata?.isBuiltin) {
            return true;
        }

        // Get plugin-specific permissions from configuration
        const config = this.getPluginPermissionConfig(context.pluginId);
        if (!config) {
            // No configuration: use default policy
            // For production, consider defaulting to false (deny-by-default)
            return true;
        }

        // Check if operation is allowed
        return config.operations.includes(operation);
    }

    /**
     * Override to implement plugin-specific path restrictions.
     */
    protected getPluginAllowedPaths(pluginId?: string): string[] | null {
        if (!pluginId) {
            return null;
        }

        const config = this.getPluginPermissionConfig(pluginId);
        if (!config) {
            return null; // No restrictions
        }

        return config.allowedPaths || null;
    }

    /**
     * Load plugin permission configuration.
     * In production, this could load from a configuration file or database.
     */
    private getPluginPermissionConfig(pluginId: string): PluginPermissionConfig | null {
        // Example: Load from a Map (in production, load from config file)
        const PLUGIN_PERMISSIONS = new Map<string, PluginPermissionConfig>([
            ['vscode.git', {
                operations: ['read', 'write', 'delete', 'stat', 'mkdir', 'rename', 'copy', 'readdir'],
                allowedPaths: null
            }],
            ['publisher.untrusted-plugin', {
                operations: ['read', 'stat', 'readdir'],
                allowedPaths: ['/workspace', '/tmp']
            }]
        ]);

        return PLUGIN_PERMISSIONS.get(pluginId) || null;
    }
}

interface PluginPermissionConfig {
    operations: FileSystemOperation[];
    allowedPaths?: string[] | null;
}
```

### Step 3: Extend the Browser Permission Service (Optional)

For VS Code API calls through `FileSystemMainImpl`, you can similarly extend the browser implementation:

```typescript
// packages/plugin-ext/src/main/browser/file-system-permission-service.ts

import { injectable } from '@theia/core/shared/inversify';
import CoreURI from '@theia/core/lib/common/uri';
import { BaseFileSystemPermissionService, FileSystemOperation, FileSystemPermissionContext } from '../../common/file-system-permission-service';

@injectable()
export class FileSystemPermissionService extends BaseFileSystemPermissionService {

    /**
     * Ask user for permission with a dialog (for sensitive operations).
     */
    protected async requestUserPermission(operation: FileSystemOperation, uri: CoreURI, context?: FileSystemPermissionContext): Promise<boolean> {
        // TODO: Implement user confirmation dialog
        // Example:
        // const result = await this.dialogService.showDialog({
        //     title: 'File System Permission',
        //     msg: `Plugin ${context?.pluginId || 'unknown'} wants to ${operation} ${uri.toString()}`,
        //     buttons: ['Allow', 'Deny']
        // });
        // return result === 'Allow';

        return true;
    }

    /**
     * Override to implement plugin-specific operation permissions.
     */
    protected isPluginAllowedOperation(operation: FileSystemOperation, context?: FileSystemPermissionContext): boolean {
        // Note: context is currently undefined for VS Code API calls
        // To enable plugin-specific permissions, the RPC protocol would need to be extended

        // For now, apply global policy
        return super.isPluginAllowedOperation(operation, context);
    }
}
```

## Configuration File Example

For production use, you might want to load permissions from a configuration file:

```json
// plugin-permissions.json
{
  "defaultPolicy": "deny",
  "builtinPluginsPolicy": "allow-all",
  "plugins": {
    "vscode.git": {
      "operations": ["read", "write", "delete", "stat", "mkdir", "rename", "copy", "readdir"],
      "allowedPaths": null
    },
    "publisher.untrusted-plugin": {
      "operations": ["read", "stat", "readdir"],
      "allowedPaths": ["/workspace", "/tmp"]
    },
    "publisher.sandboxed-plugin": {
      "operations": ["read", "write", "stat", "mkdir", "readdir"],
      "allowedPaths": ["/home/.theia/plugins/{pluginId}"]
    }
  }
}
```

## Testing Your Configuration

### Test 1: Built-in Plugin (Full Access)
```typescript
const context: FileSystemPermissionContext = {
    pluginId: 'vscode.git',
    pluginMetadata: { isBuiltin: true }
};

// Should succeed
await permissionService.checkPermission('write', uri, context);
```

### Test 2: Untrusted Plugin (Read-Only, Limited Paths)
```typescript
const context: FileSystemPermissionContext = {
    pluginId: 'publisher.untrusted-plugin',
    pluginMetadata: { isBuiltin: false }
};

// Should succeed (read in allowed path)
await permissionService.checkPermission('read', new URI('/workspace/file.txt'), context);

// Should fail (write operation not allowed)
await permissionService.checkPermission('write', new URI('/workspace/file.txt'), context);

// Should fail (path not allowed)
await permissionService.checkPermission('read', new URI('/etc/passwd'), context);
```

### Test 3: Sandboxed Plugin (Own Directory Only)
```typescript
const context: FileSystemPermissionContext = {
    pluginId: 'publisher.sandboxed-plugin',
    pluginMetadata: { isBuiltin: false }
};

// Should succeed (within own directory)
await permissionService.checkPermission('write', new URI('/home/.theia/plugins/publisher.sandboxed-plugin/data.json'), context);

// Should fail (outside own directory)
await permissionService.checkPermission('write', new URI('/workspace/file.txt'), context);
```

## Security Best Practices

1. **Deny by Default**: For production, set the default policy to deny and explicitly allow trusted plugins.

2. **Principle of Least Privilege**: Only grant the minimum permissions needed for each plugin.

3. **Path Validation**: Always validate and normalize paths to prevent directory traversal attacks.

4. **Audit Logging**: Log all permission checks and denials for security auditing.

5. **User Consent**: For sensitive operations, consider asking for user confirmation.

6. **Configuration Validation**: Validate permission configurations at startup to catch errors early.

7. **Built-in Plugin Trust**: Only mark truly trusted plugins as built-in.

## Current Limitations

1. **VS Code API Context**: The RPC protocol doesn't currently pass plugin context for VS Code API calls (`vscode.workspace.fs.*`). To enable plugin-specific permissions for these calls, the RPC protocol would need to be extended.

2. **Synchronous Checks**: Some Node.js fs methods are synchronous, limiting the permission checks to synchronous validation only.

3. **Module Patching**: The interceptor uses `Module.prototype.require` patching, which may not catch all fs access methods (e.g., native modules).

## Future Enhancements

1. **RPC Context Extension**: Extend RPC protocol to pass plugin ID with each request.

2. **User Permission Dialogs**: Implement UI dialogs for runtime permission requests.

3. **Permission Caching**: Cache permission decisions to improve performance.

4. **Dynamic Configuration**: Support runtime configuration updates without restart.

5. **Fine-grained Path Patterns**: Support glob patterns and regular expressions for path matching.
