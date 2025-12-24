import { injectable } from '@theia/core/shared/inversify';
import * as path from 'path';
import URI from '@theia/core/lib/common/uri';
import { FileUri } from '@theia/core/lib/common/file-uri';
import { PluginPackage } from '../../../common';
import { PluginUriFactory } from './plugin-uri-factory';
/**
 * The default implementation of PluginUriFactory simply returns a File URI from the concatenated
 * package path and relative path.
 */
@injectable()
export class FilePluginUriFactory implements PluginUriFactory {
    createUri(pkg: PluginPackage, pkgRelativePath?: string): URI {
        return FileUri.create(pkgRelativePath ? path.join(pkg.packagePath, pkgRelativePath) : pkg.packagePath);
    }
}
