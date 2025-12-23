import * as os from 'os';
import * as path from 'path';
import { realpathSync, promises as fs } from 'fs';

export function getTempDir(name: string): string {
    let tempDir = os.tmpdir();
    // for mac os 'os.tmpdir()' return symlink, but we need real path
    if (process.platform === 'darwin') {
        tempDir = realpathSync(tempDir);
    }
    return path.resolve(tempDir, name);
}

export async function getTempDirPathAsync(name: string): Promise<string> {
    let tempDir = os.tmpdir();
    // for mac os 'os.tmpdir()' return symlink, but we need real path
    if (process.platform === 'darwin') {
        tempDir = await fs.realpath(tempDir);
    }
    return path.resolve(tempDir, name);
}
