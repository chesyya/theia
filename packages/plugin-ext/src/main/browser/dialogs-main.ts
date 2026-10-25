// *****************************************************************************
// Copyright (C) 2018 Red Hat, Inc. and others.
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

import { interfaces } from '@theia/core/shared/inversify';
import { RPCProtocol } from '../../common/rpc-protocol';
import {
    OpenDialogOptionsMain, SaveDialogOptionsMain, DialogsMain, UploadDialogOptionsMain, DialogAutomationHandleDTO,
    DialogAutomationSnapshotDTO, DialogAutomationStateDTO, DialogAutomationConfirmResultDTO, DialogAutomationActionDTO
} from '../../common/plugin-api-rpc';
import { OpenFileDialogProps, SaveFileDialogProps, FileDialogService } from '@theia/filesystem/lib/browser';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import URI from '@theia/core/lib/common/uri';
import { FileUploadService } from '@theia/filesystem/lib/browser/file-upload-service';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { nls } from '@theia/core';
import { DialogAutomation, DialogOverlayService } from '@theia/core/lib/browser';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';

export class DialogsMainImpl implements DialogsMain {

    private workspaceService: WorkspaceService;
    private fileService: FileService;
    private environments: EnvVariablesServer;

    private fileDialogService: FileDialogService;
    private uploadService: FileUploadService;
    private dialogOverlayService: DialogOverlayService;

    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.workspaceService = container.get(WorkspaceService);
        this.fileService = container.get(FileService);
        this.environments = container.get(EnvVariablesServer);
        this.fileDialogService = container.get(FileDialogService);
        this.uploadService = container.get(FileUploadService);
        this.dialogOverlayService = container.get(DialogOverlayService);
    }

    protected async getRootStat(defaultUri: string | undefined): Promise<FileStat | undefined> {
        let rootStat: FileStat | undefined;

        // Try to use default URI as root
        if (defaultUri) {
            try {
                rootStat = await this.fileService.resolve(new URI(defaultUri));
            } catch {
                rootStat = undefined;
            }

            // Try to use as root the parent folder of existing file URI/non existing URI
            if (rootStat && !rootStat.isDirectory || !rootStat) {
                try {
                    rootStat = await this.fileService.resolve(new URI(defaultUri).parent);
                } catch {
                    rootStat = undefined;
                }
            }
        }

        // Try to use workspace service root if there is no pre-configured URI
        if (!rootStat) {
            rootStat = (await this.workspaceService.roots)[0];
        }

        // Try to use current user home if root folder is still not taken
        if (!rootStat) {
            const homeDirUri = await this.environments.getHomeDirUri();
            try {
                rootStat = await this.fileService.resolve(new URI(homeDirUri));
            } catch { }
        }

        return rootStat;
    }

    async $showOpenDialog(options: OpenDialogOptionsMain): Promise<string[] | undefined> {
        const rootStat = await this.getRootStat(options.defaultUri ? options.defaultUri : undefined);
        if (!rootStat) {
            throw new Error('Unable to find the rootStat');
        }

        try {
            const canSelectFiles = typeof options.canSelectFiles === 'boolean' ? options.canSelectFiles : true;
            const canSelectFolders = typeof options.canSelectFolders === 'boolean' ? options.canSelectFolders : true;

            let title = options.title;
            if (!title) {
                if (canSelectFiles && canSelectFolders) {
                    title = 'Open';
                } else {
                    if (canSelectFiles) {
                        title = 'Open File';
                    } else {
                        title = 'Open Folder';
                    }
                    if (options.canSelectMany) {
                        title += '(s)';
                    }
                }
            }

            // Create open file dialog props
            const dialogProps = {
                title: title,
                openLabel: options.openLabel,
                canSelectFiles: options.canSelectFiles,
                canSelectFolders: options.canSelectFolders,
                canSelectMany: options.canSelectMany,
                filters: options.filters
            } as OpenFileDialogProps;

            const result = await this.fileDialogService.showOpenDialog(dialogProps, rootStat);
            if (Array.isArray(result)) {
                return result.map(uri => uri.path.toString());
            } else {
                return result ? [result].map(uri => uri.path.toString()) : undefined;
            }
        } catch (error) {
            console.error(error);
        }

        return undefined;
    }

    async $showSaveDialog(options: SaveDialogOptionsMain): Promise<string | undefined> {
        const rootStat = await this.getRootStat(options.defaultUri ? options.defaultUri : undefined);

        // File name field should be empty unless the URI is a file
        let fileNameValue = '';
        if (options.defaultUri) {
            let defaultURIStat: FileStat | undefined;
            try {
                defaultURIStat = await this.fileService.resolve(new URI(options.defaultUri));
            } catch { }
            if (defaultURIStat && !defaultURIStat.isDirectory || !defaultURIStat) {
                fileNameValue = new URI(options.defaultUri).path.base;
            }
        }

        try {
            // Create save file dialog props
            const dialogProps = {
                title: options.title ?? nls.localizeByDefault('Save'),
                saveLabel: options.saveLabel,
                filters: options.filters,
                inputValue: fileNameValue
            } as SaveFileDialogProps;

            const result = await this.fileDialogService.showSaveDialog(dialogProps, rootStat);
            if (result) {
                return result.path.toString();
            }
            return undefined;
        } catch (error) {
            console.error(error);
        }

        return undefined;
    }

    async $showUploadDialog(options: UploadDialogOptionsMain): Promise<string[] | undefined> {
        const rootStat = await this.getRootStat(options.defaultUri);

        // Fail if root not fount
        if (!rootStat) {
            throw new Error('Failed to resolve base directory where files should be uploaded');
        }

        const uploadResult = await this.uploadService.upload(rootStat.resource.toString());

        if (uploadResult) {
            return uploadResult.uploaded;
        }

        return undefined;
    }

    async $getActiveDialog(): Promise<DialogAutomationHandleDTO | undefined> {
        this.assertDialogAutomationEnabled();
        const activeDialog = this.dialogOverlayService.getActiveDialogAutomation();
        return activeDialog ? { id: activeDialog.id } : undefined;
    }

    async $getDialogSnapshot(id: string): Promise<DialogAutomationSnapshotDTO> {
        return this.getDialogAutomation(id).getAutomationSnapshot();
    }

    async $getDialogState(id: string): Promise<DialogAutomationStateDTO> {
        return this.getDialogAutomation(id).getAutomationState();
    }

    async $setDialogState(id: string, patch: DialogAutomationStateDTO): Promise<void> {
        await this.getDialogAutomation(id).setAutomationState(patch);
    }

    async $confirmDialog(id: string): Promise<DialogAutomationConfirmResultDTO> {
        return this.getDialogAutomation(id).confirmFromAutomation();
    }

    async $cancelDialog(id: string): Promise<void> {
        await this.getDialogAutomation(id).cancelFromAutomation();
    }

    async $getDialogActions(id: string): Promise<readonly DialogAutomationActionDTO[]> {
        return this.getDialogAutomation(id).getAutomationActions();
    }

    async $invokeDialogAction(id: string, actionId: string): Promise<void> {
        await this.getDialogAutomation(id).invokeAutomationAction(actionId);
    }

    protected getDialogAutomation(id: string): DialogAutomation {
        this.assertDialogAutomationEnabled();
        const dialog = this.dialogOverlayService.getDialogAutomation(id);
        if (!dialog) {
            throw this.createDialogAutomationError('DialogClosedError', `Dialog '${id}' is closed or no longer available.`);
        }
        return dialog;
    }

    protected assertDialogAutomationEnabled(): void {
        if (!FrontendApplicationConfigProvider.get().pluginDialogAutomation) {
            throw this.createDialogAutomationError(
                'DialogAutomationDisabledError',
                'Plugin dialog automation is disabled. Enable the "pluginDialogAutomation" frontend application option for integration tests.'
            );
        }
    }

    protected createDialogAutomationError(name: string, message: string): Error {
        const error = new Error(message);
        error.name = name;
        return error;
    }

}
