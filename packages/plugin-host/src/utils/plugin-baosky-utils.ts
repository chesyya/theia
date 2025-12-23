import decompress from 'decompress';
import * as path from 'path';
import filenamify from 'filenamify';
import { FileUri } from '@theia/core/lib/node';
import * as fs from '@theia/core/shared/fs-extra';
import { PluginBaoskyEnvironment } from '../main/node/plugin-baosky-environment';
import { UserPluginEnvironment } from '../main/common/user-plugin-management/user-plugin-environment-service';
import { PluginDeployOptions } from '../common';
import { URI } from '@theia/core';
import crypto from 'crypto';

export async function decompressExtension(sourcePath: string, destPath: string): Promise<boolean> {
    try {
        await decompress(sourcePath, destPath);
        if (sourcePath.endsWith('.tgz')) {
            // unzip node_modules from built-in extensions, see https://github.com/eclipse-theia/theia/issues/5756
            const extensionPath = path.join(destPath, 'package');
            const baoskyNodeModulesPath = path.join(extensionPath, 'baosky_node_modules.zip');
            if (await fs.pathExists(baoskyNodeModulesPath)) {
                await decompress(baoskyNodeModulesPath, path.join(extensionPath, 'node_modules'));
            }
        }
        return true;
    } catch (error) {
        console.error(`Failed to decompress ${sourcePath} to ${destPath}: ${error}`);
        throw error;
    }
}

export async function existsInDeploymentDir(env: PluginBaoskyEnvironment | UserPluginEnvironment, extensionId: string, options?: PluginDeployOptions): Promise<boolean> {
    const path = await getExtensionDeploymentDir(env, extensionId, options);
    if (path && typeof path !== 'string') {
        return fs.pathExists(path.shared) || fs.pathExists(path.user);
    }
    else
        return fs.pathExists(path);
}

export const TMP_DIR_PREFIX = 'tmp-baosky-unpacked-';
export async function unpackToDeploymentDir(
  env: PluginBaoskyEnvironment | UserPluginEnvironment,
  sourcePath: string, // 插件压缩包的路径
  extensionId: string, // 插件 ID
  options?: PluginDeployOptions // 部署选项（如是否为共享插件）
): Promise<string> {
  const path = await getExtensionDeploymentDir(env, extensionId, options);
  let pluginDeploymentDir: string;
  if (path && typeof path !== "string") {
    pluginDeploymentDir = options?.shared ? path.shared : path.user;
    if (await fs.pathExists(path.shared)) {
      console.log(
        `[${extensionId}]: deployment dir "${path.shared}" already exists`
      );
      return path.shared;
    }
    if (await fs.pathExists(path.user)) {
      console.log(
        `[${extensionId}]: deployment dir "${path.user}" already exists`
      );
      return path.user;
    }
  } else {
    pluginDeploymentDir = path;
    if (await fs.pathExists(path)) {
      console.log(`[${extensionId}]: deployment dir "${path}" already exists`);
      return path;
    }
  }

  // 创建临时目录用于解压
  const tempDir = await getTempDir(env, TMP_DIR_PREFIX, options);
  try {
    console.log(
      `[${extensionId}]: trying to decompress "${sourcePath}" into "${tempDir}"...`
    );
    // 解压插件到临时目录
    if (!(await decompressExtension(sourcePath, tempDir))) {
      await fs.remove(tempDir);
      const msg = `[${extensionId}]: decompressing "${sourcePath}" to "${tempDir}" failed`;
      console.error(msg);
      throw new Error(msg);
    }
  } catch (e) {
    await fs.remove(tempDir);
    const msg = `[${extensionId}]: error while decompressing "${sourcePath}" to "${tempDir}"`;
    console.error(msg, e);
    throw e;
  }
  console.log(`[${extensionId}]: decompressed to temp dir "${tempDir}"`);

  try {
    console.log(
      `[${extensionId}]: renaming to extension dir "${pluginDeploymentDir}"...`
    );
    // 重命名临时目录为目标目录
    await fs.rename(tempDir, pluginDeploymentDir);
    return pluginDeploymentDir;
  } catch (e) {
    await fs.remove(tempDir);
    console.error(
      `[${extensionId}]: error while renaming "${tempDir}" to "${pluginDeploymentDir}"`,
      e
    );
    throw e;
  }
}

export async function getExtensionDeploymentDir(env: PluginBaoskyEnvironment | UserPluginEnvironment, extensionId: string, options?: PluginDeployOptions): Promise<string | { shared: string, user: string }> {
    let deployedPluginsDirUri: URI;
    const normalizedExtensionId = filenamify(extensionId, { replacement: '_' });
    if (env instanceof UserPluginEnvironment) {
        const sharedPluginsDirUri = await env.getSharedPluginsDirUri();
        const userPluginsDirUri = await env.getUserPluginsDirUri(options?.userId!);
        const sharedExtensionDeploymentDirPath = FileUri.fsPath(sharedPluginsDirUri.resolve(normalizedExtensionId));
        const userExtensionDeploymentDirPath = FileUri.fsPath(userPluginsDirUri.resolve(normalizedExtensionId));
        return {
            shared: sharedExtensionDeploymentDirPath,
            user: userExtensionDeploymentDirPath
        }
    }
    else
        deployedPluginsDirUri = await env.getDeploymentDirUri();
    const extensionDeploymentDirPath = FileUri.fsPath(deployedPluginsDirUri.resolve(normalizedExtensionId));
    return extensionDeploymentDirPath;
}

export async function getTempDir(env: PluginBaoskyEnvironment | UserPluginEnvironment, prefix: string, options?: PluginDeployOptions): Promise<string> {
    let deploymentDirPath: string;
    if (env instanceof UserPluginEnvironment) {
        if (options?.shared) {
            deploymentDirPath = FileUri.fsPath(await env.getSharedPluginsDirUri());
        }
        else
            deploymentDirPath = FileUri.fsPath(await env.getUserPluginsDirUri(options?.userId!));
    }
    else
        deploymentDirPath = FileUri.fsPath(await env.getDeploymentDirUri());
    try {
        if (!await fs.pathExists(deploymentDirPath)) {
            console.log(`Creating deployment dir ${deploymentDirPath}`);
            await fs.mkdirs(deploymentDirPath);
        }
        return await fs.mkdtemp(path.join(deploymentDirPath, prefix));
    } catch (error) {
        console.error(`Failed to create deployment dir ${deploymentDirPath}: ${error}`);
        throw error;
    }
}

export async function verifyIntegrity(pluginPath: string): Promise<boolean> {
  // 1. 读取签名文件
  const sigPath = path.join(pluginPath, 'signature.sig')
  if(!fs.existsSync(sigPath)){
    console.error('未找到签名文件！')
    return false
  }
  const sigData = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
  // 2. 重新计算当前文件哈希
  const currentHashes = {};
  for (const file of Object.keys(sigData.files)) {
    const filePath = path.join(pluginPath, file);
    if (!fs.existsSync(filePath)){
      console.error('缺失代码文件！')
      return false
    }
    const data = fs.readFileSync(filePath);
    currentHashes[file] = crypto.createHash('sha256').update(data).digest('hex');
  }

  // 3. 验证哈希是否一致
  if (JSON.stringify(currentHashes) !== JSON.stringify(sigData.files)) {
    console.error('文件完整性验证失败！文件已被修改！');
    return false
  }

  // 4. 用公钥验证签名
  const publicKey = getPublicKey();
  const isValid = crypto.verify(
    'sha256',
    Buffer.from(sigData.manifestHash),
    publicKey,
    Buffer.from(sigData.signature, 'base64')
  );

  if (!isValid) {
    console.error('签名验证失败！签名无效！');
	return false;
  }

  console.log('✅ All files are authentic and unmodified.');
  return true;
}

export function getPublicKey(): string {
  const certPath = path.join(__dirname, 'cert.pem');
  const publicKey = fs.readFileSync(certPath, 'utf8');
  return publicKey
}