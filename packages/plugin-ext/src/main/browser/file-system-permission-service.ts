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
import CoreURI from '@theia/core/lib/common/uri';
import { BaseFileSystemPermissionService, FileSystemOperation } from '../../common/file-system-permission-service';

export { FileSystemOperation };

/**
 * Browser-side implementation of file system permission service.
 * This service can be extended to implement custom permission logic, user confirmations,
 * audit logging, and path restrictions.
 */
@injectable()
export class FileSystemPermissionService extends BaseFileSystemPermissionService {

    // Browser-specific overrides can be added here if needed

    /**
     * Ask user for permission (can be implemented with a dialog).
     * This is useful for sensitive operations.
     */
    protected async requestUserPermission(operation: FileSystemOperation, uri: CoreURI): Promise<boolean> {
        // TODO: Implement user confirmation dialog
        // For now, just return true
        return true;
    }
}
