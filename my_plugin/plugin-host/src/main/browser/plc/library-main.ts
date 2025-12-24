/*
 * @Author: 南天远 nantianyuan@baosight.com
 * @Date: 2025-11-27 15:25:44
 * @FilePath: /workdir/packages/plugin-host/src/main/browser/plc/library-main.ts
 * Copyright (c) 2025 by Baosight, All Rights Reserved.
 * @Description:
 * @LastEditors: 南天远 nantianyuan@baosight.com
 * @LastEditTime: 2025-11-28 13:24:52
 */
import * as baosky from '@baosky/plugin';
import { interfaces } from "@theia/core/shared/inversify";
import { LibraryExt, LibraryMain } from "../../../common";
import { LibraryManagerService, LibraryService, ProjectLibService } from '@baosky/plc-protocol/lib/browser/software/library';
import { URI } from '@theia/core';
import { UriComponents } from '@theia/core/lib/common/uri';
import { ReferenceLibraryController } from '@baosky/plc-protocol/lib/browser/software/library/reference-lib/controller/reference-lib-controller';
import { GlobalQuickfixProvider } from '@baosky/plc-protocol/lib/browser/quick-fix/quick-fix-interface'

export class LibraryMainImpl implements LibraryMain {

    protected readonly projectLibService: ProjectLibService;
    protected readonly referenceLibraryController: ReferenceLibraryController;
    protected readonly libraryManagerService: LibraryManagerService;
    protected readonly globalQuickfixProvider: GlobalQuickfixProvider;
    protected readonly proxy: LibraryExt;
    protected readonly libraryService: LibraryService;

    constructor(container: interfaces.Container) {
        this.projectLibService = container.get(ProjectLibService);
        this.referenceLibraryController = container.get(ReferenceLibraryController);
        this.libraryManagerService = container.get(LibraryManagerService);
        this.globalQuickfixProvider = container.get(GlobalQuickfixProvider);
        this.libraryService = container.get(LibraryService);
    }
    $getAllLibraryInfo(type: baosky.LibraryCategory) {
        return this.libraryService.getAllLibraryInfo(type as any);
    }

    $addToRefLibByLibSet(plcUri: UriComponents, libSetParamters: { libSet: string; version: string; category: string; }) {
        return this.referenceLibraryController.addToRefLibByLibSet(URI.fromComponents(plcUri), libSetParamters);
    }

    $getAllLibraryElements(options: { plcUri: UriComponents; filterId: baosky.LibraryFilterId; withVersion?: boolean; }) {
        return this.projectLibService.getAllLibraryElements({...options, uri: URI.fromComponents(options.plcUri)});
    }

    $getAllReferenceLibElement(plcUri: UriComponents) {
        return this.libraryManagerService.getAllReferenceLibElement(URI.fromComponents(plcUri));
    }

}
