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

import { inject, injectable } from '@theia/core/shared/inversify';
import { PluginDeployerParticipant, PluginDeployerStartContext } from '@baosky/plugin-host';
import { BsxCli } from './bsx-cli';
import { BSXExtensionUri } from '../common';
import * as fs from 'fs';
import { FileUri } from '@theia/core/lib/node';
import * as path from 'path';

@injectable()
export class BsxCliDeployerParticipant implements PluginDeployerParticipant {

    @inject(BsxCli)
    protected readonly bsxCli: BsxCli;

    async onWillStart(context: PluginDeployerStartContext): Promise<void> {
        const pluginUris = await Promise.all(this.bsxCli.pluginsToInstall.map(async id => {
            try {
                const resolvedPath = path.resolve(id);
                const stat = await fs.promises.stat(resolvedPath);
                if (stat.isFile()) {
                    return FileUri.create(resolvedPath).withScheme('local-file').toString();
                }
            } catch (e) {
                // expected if file does not exist
            }
            return BSXExtensionUri.fromVersionedId(id).toString();
        }));
        context.userEntries.push(...pluginUris);
    }
}
