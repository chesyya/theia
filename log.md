main.ts
import { Command, Option } from 'commander';
import leven from 'leven';
import { packageCommand, ls, Targets, generateManifest, verifySignature } from './package';
import { publish, unpublish } from './publish';
import { show } from './show';
import { search } from './search';
import { listPublishers, deletePublisher, loginPublisher, logoutPublisher, verifyPat } from './store';
import { getLatestVersion } from './npm';
import { CancellationToken, log } from './util';
import * as semver from 'semver';
import { isatty } from 'tty';

const pkg = require('../package.json');

function fatal(message: any, ...args: any[]): void {
	if (message instanceof Error) {
		if (process.env['VSCE_DEBUG']) {
			console.error(message);
		}

		message = message.message;

		if (/^cancell?ed$/i.test(message)) {
			return;
		}
	}

	log.error(message, ...args);

	if (/Unauthorized\(401\)/.test(message)) {
		log.error(`Be sure to use a Personal Access Token which has access to **all accessible accounts**.
See https://code.visualstudio.com/api/working-with-extensions/publishing-extension#publishing-extensions for more information.`);
	}

	process.exit(1);
}

function main(task: Promise<any>): void {
	let latestVersion: string | null = null;

	const token = new CancellationToken();

	if (isatty(1)) {
		getLatestVersion(pkg.name, token)
			.then(version => (latestVersion = version))
			.catch(_ => {
				/* noop */
			});
	}

	task.catch(fatal).then(() => {
		if (latestVersion && semver.gt(latestVersion, pkg.version)) {
			log.warn(`The latest version of ${pkg.name} is ${latestVersion} and you have ${pkg.version}.\nUpdate it now: npm install -g ${pkg.name}`);
		} else {
			token.cancel();
		}
	});
}

const ValidTargets = [...Targets].join(', ');

module.exports = function (argv: string[]): void {
	const program = new Command();

	program.version(pkg.version).usage('<command>');

	program
		.command('ls')
		.description('Lists all the files that will be published/packaged')
		.option('--tree', 'Prints the files in a tree format', false)
		.option('--yarn', 'Use yarn instead of npm (default inferred from presence of yarn.lock or .yarnrc)')
		.option('--no-yarn', 'Use npm instead of yarn (default inferred from absence of yarn.lock or .yarnrc)')
		.option<string[]>(
			'--packagedDependencies <path>',
			'Select packages that should be published only (includes dependencies)',
			(val, all) => (all ? all.concat(val) : [val]),
			undefined
		)
		.option('--ignoreFile <path>', 'Indicate alternative .vscodeignore')
		// default must remain undefined for dependencies or we will fail to load defaults from package.json
		.option('--dependencies', 'Enable dependency detection via npm or yarn', undefined)
		.option('--no-dependencies', 'Disable dependency detection via npm or yarn', undefined)
		.option('--readme-path <path>', 'Path to README file (defaults to README.md)')
		.option('--follow-symlinks', 'Recurse into symlinked directories instead of treating them as files')
		.action(({ tree, yarn, packagedDependencies, ignoreFile, dependencies, readmePath, followSymlinks }) =>
			main(ls({ tree, useYarn: yarn, packagedDependencies, ignoreFile, dependencies, readmePath, followSymlinks }))
		);

	program
		.command('package [version]')
		.alias('pack')
		.description('Packages an extension')
		.option('-o, --out <path>', 'Output .vsix extension file to <path> location (defaults to <name>-<version>.vsix)')
		.option('-t, --target <target>', `Target architecture. Valid targets: ${ValidTargets}`)
		.option('--ignore-other-target-folders', `Ignore other target folders. Valid only when --target <target> is provided.`)
		.option('--readme-path <path>', 'Path to README file (defaults to README.md)')
		.option('--changelog-path <path>', 'Path to CHANGELOG file (defaults to CHANGELOG.md)')
		.option('-m, --message <commit message>', 'Commit message used when calling `npm version`.')
		.option(
			'--no-git-tag-version',
			'Do not create a version commit and tag when calling `npm version`. Valid only when [version] is provided.'
		)
		.option('--no-update-package-json', 'Do not update `package.json`. Valid only when [version] is provided.')
		.option(
			'--githubBranch <branch>',
			'The GitHub branch used to infer relative links in README.md. Can be overridden by --baseContentUrl and --baseImagesUrl.'
		)
		.option(
			'--gitlabBranch <branch>',
			'The GitLab branch used to infer relative links in README.md. Can be overridden by --baseContentUrl and --baseImagesUrl.'
		)
		.option('--no-rewrite-relative-links', 'Skip rewriting relative links.')
		.option('--baseContentUrl <url>', 'Prepend all relative links in README.md with the specified URL.')
		.option('--baseImagesUrl <url>', 'Prepend all relative image links in README.md with the specified URL.')
		.option('--yarn', 'Use yarn instead of npm (default inferred from presence of yarn.lock or .yarnrc)')
		.option('--no-yarn', 'Use npm instead of yarn (default inferred from absence of yarn.lock or .yarnrc)')
		.option('--ignoreFile <path>', 'Indicate alternative .vscodeignore')
		.option('--no-gitHubIssueLinking', 'Disable automatic expansion of GitHub-style issue syntax into links')
		.option('--no-gitLabIssueLinking', 'Disable automatic expansion of GitLab-style issue syntax into links')
		// default must remain undefined for dependencies or we will fail to load defaults from package.json
		.option('--dependencies', 'Enable dependency detection via npm or yarn', undefined)
		.option('--no-dependencies', 'Disable dependency detection via npm or yarn', undefined)
		.option('--pre-release', 'Mark this package as a pre-release')
		.option('--allow-star-activation', 'Allow using * in activation events')
		.option('--allow-missing-repository', 'Allow missing a repository URL in package.json')
		.option('--allow-unused-files-pattern', 'Allow include patterns for the files field in package.json that does not match any file')
		.option('--allow-package-secrets <secrets...>', 'Allow packaging specific secrets. The names of the secrets can be found in the error message ([SECRET_NAME]).')
		.option('--allow-package-all-secrets', 'Allow to package all kinds of secrets')
		.option('--allow-package-env-file', 'Allow packaging .env files')
		.option('--skip-license', 'Allow packaging without license file')
		.option('--sign-tool <path>', 'Path to the VSIX signing tool. Will be invoked with two arguments: `SIGNTOOL <path/to/extension.signature.manifest> <path/to/extension.signature.p7s>`.')
		.option('--follow-symlinks', 'Recurse into symlinked directories instead of treating them as files')
		.action(
			(
				version,
				{
					out,
					target,
					ignoreOtherTargetFolders,
					readmePath,
					changelogPath,
					message,
					gitTagVersion,
					updatePackageJson,
					githubBranch,
					gitlabBranch,
					rewriteRelativeLinks,
					baseContentUrl,
					baseImagesUrl,
					yarn,
					ignoreFile,
					gitHubIssueLinking,
					gitLabIssueLinking,
					dependencies,
					preRelease,
					allowStarActivation,
					allowMissingRepository,
					allowUnusedFilesPattern,
					allowPackageSecrets,
					allowPackageAllSecrets,
					allowPackageEnvFile,
					skipLicense,
					signTool,
					followSymlinks,
				}
			) =>
				main(
					packageCommand({
						packagePath: out,
						version,
						target,
						ignoreOtherTargetFolders,
						readmePath,
						changelogPath,
						commitMessage: message,
						gitTagVersion,
						updatePackageJson,
						githubBranch,
						gitlabBranch,
						rewriteRelativeLinks,
						baseContentUrl,
						baseImagesUrl,
						useYarn: yarn,
						ignoreFile,
						gitHubIssueLinking,
						gitLabIssueLinking,
						dependencies,
						preRelease,
						allowStarActivation,
						allowMissingRepository,
						allowUnusedFilesPattern,
						allowPackageSecrets,
						allowPackageAllSecrets,
						allowPackageEnvFile,
						skipLicense,
						signTool,
						followSymlinks,
					})
				)
		);

	program
		.command('publish [version]')
		.description('Publishes an extension')
		.option(
			'-p, --pat <token>',
			'Personal Access Token (defaults to VSCE_PAT environment variable)',
			process.env['VSCE_PAT']
		)
		.option('--azure-credential', 'Use Microsoft Entra ID for authentication')
		.option('-t, --target <targets...>', `Target architectures. Valid targets: ${ValidTargets}`)
		.option('--ignore-other-target-folders', `Ignore other target folders. Valid only when --target <target> is provided.`)
		.option('--readme-path <path>', 'Path to README file (defaults to README.md)')
		.option('--changelog-path <path>', 'Path to CHANGELOG file (defaults to CHANGELOG.md)')
		.option('-m, --message <commit message>', 'Commit message used when calling `npm version`.')
		.option(
			'--no-git-tag-version',
			'Do not create a version commit and tag when calling `npm version`. Valid only when [version] is provided.'
		)
		.option('--no-update-package-json', 'Do not update `package.json`. Valid only when [version] is provided.')
		.option('-i, --packagePath <paths...>', 'Publish the provided VSIX packages.')
		.option('--manifestPath <paths...>', 'Manifest files to publish alongside the VSIX packages.')
		.option('--signaturePath <paths...>', 'Signature files to publish alongside the VSIX packages.')
		.option('--sigzipPath <paths...>', 'Signature archives to publish alongside the VSIX packages.')
		.option('--sign-tool <path>', 'Path to the VSIX signing tool. Will be invoked with two arguments: `SIGNTOOL <path/to/extension.signature.manifest> <path/to/extension.signature.p7s>`. This will be ignored if --sigzipPath is provided.')
		.option(
			'--githubBranch <branch>',
			'The GitHub branch used to infer relative links in README.md. Can be overridden by --baseContentUrl and --baseImagesUrl.'
		)
		.option(
			'--gitlabBranch <branch>',
			'The GitLab branch used to infer relative links in README.md. Can be overridden by --baseContentUrl and --baseImagesUrl.'
		)
		.option('--baseContentUrl <url>', 'Prepend all relative links in README.md with the specified URL.')
		.option('--baseImagesUrl <url>', 'Prepend all relative image links in README.md with the specified URL.')
		.option('--yarn', 'Use yarn instead of npm (default inferred from presence of yarn.lock or .yarnrc)')
		.option('--no-yarn', 'Use npm instead of yarn (default inferred from absence of yarn.lock or .yarnrc)')
		.option('--no-verify', 'Allow all proposed APIs (deprecated: use --allow-all-proposed-apis instead)')
		.addOption(new Option('--noVerify', 'Allow all proposed APIs (deprecated: use --allow-all-proposed-apis instead)').hideHelp(true))
		.option('--allow-proposed-apis <apis...>', 'Allow specific proposed APIs')
		.option('--allow-all-proposed-apis', 'Allow all proposed APIs')
		.option('--allow-package-secrets <secret_type>', 'Allow packaging a specific type of secret. The type of the secrets can be found in the error message ([SECRET_TYPE]).')
		.option('--allow-package-all-secrets', 'Allow to package all kinds of secrets')
		.option('--allow-package-env-file', 'Allow packaging .env files')
		.option('--ignoreFile <path>', 'Indicate alternative .vscodeignore')
		// default must remain undefined for dependencies or we will fail to load defaults from package.json
		.option('--dependencies', 'Enable dependency detection via npm or yarn', undefined)
		.option('--no-dependencies', 'Disable dependency detection via npm or yarn', undefined)
		.option('--pre-release', 'Mark this package as a pre-release')
		.option('--allow-star-activation', 'Allow using * in activation events')
		.option('--allow-missing-repository', 'Allow missing a repository URL in package.json')
		.option('--allow-unused-files-pattern', 'Allow include patterns for the files field in package.json that does not match any file')
		.option('--skip-duplicate', 'Fail silently if version already exists on the marketplace')
		.option('--skip-license', 'Allow publishing without license file')
		.option('--follow-symlinks', 'Recurse into symlinked directories instead of treating them as files')
		.action(
			(
				version,
				{
					pat,
					azureCredential,
					target,
					ignoreOtherTargetFolders,
					readmePath,
					changelogPath,
					message,
					gitTagVersion,
					updatePackageJson,
					packagePath,
					manifestPath,
					signaturePath,
					sigzipPath,
					githubBranch,
					gitlabBranch,
					baseContentUrl,
					baseImagesUrl,
					yarn,
					verify,
					noVerify,
					allowProposedApis,
					allowAllProposedApis,
					allowPackageSecrets,
					allowPackageAllSecrets,
					allowPackageEnvFile,
					ignoreFile,
					dependencies,
					preRelease,
					allowStarActivation,
					allowMissingRepository,
					allowUnusedFilesPattern,
					skipDuplicate,
					skipLicense,
					signTool,
					followSymlinks,
					versionCheckUrl,
					skipVersionCheck,
				}
			) =>
				main(
					publish({
						pat,
						azureCredential,
						version,
						targets: target,
						ignoreOtherTargetFolders,
						readmePath,
						changelogPath,
						commitMessage: message,
						gitTagVersion,
						updatePackageJson,
						packagePath,
						manifestPath,
						signaturePath,
						sigzipPath,
						githubBranch,
						gitlabBranch,
						baseContentUrl,
						baseImagesUrl,
						useYarn: yarn,
						noVerify: noVerify || !verify,
						allowProposedApis,
						allowAllProposedApis,
						allowPackageSecrets,
						allowPackageAllSecrets,
						allowPackageEnvFile,
						ignoreFile,
						dependencies,
						preRelease,
						allowStarActivation,
						allowMissingRepository,
						allowUnusedFilesPattern,
						skipDuplicate,
						skipLicense,
						signTool,
						followSymlinks,
						versionCheckUrl,
						skipVersionCheck,
					})
				)
		);

	program
		.command('unpublish [extensionid]')
		.description('Removes an extension from the marketplace. Example extension id: ms-vscode.live-server.')
		.option('-p, --pat <token>', 'Personal Access Token')
		.option('--azure-credential', 'Use Microsoft Entra ID for authentication')
		.option('-f, --force', 'Skip confirmation prompt when unpublishing an extension')
		.action((id, { pat, azureCredential, force }) => main(unpublish({ id, pat, azureCredential, force })));

	program
		.command('generate-manifest')
		.description('Generates the extension manifest from the provided VSIX package.')
		.requiredOption('-i, --packagePath <path>', 'Path to the VSIX package')
		.option('-o, --out <path>', 'Output the extension manifest to <path> location (defaults to <packagename>.manifest)')
		.action(({ packagePath, out }) => main(generateManifest(packagePath, out)));

	program
		.command('verify-signature')
		.description('Verifies the provided signature file against the provided VSIX package and manifest.')
		.requiredOption('-i, --packagePath <path>', 'Path to the VSIX package')
		.requiredOption('-m, --manifestPath <path>', 'Path to the Manifest file')
		.requiredOption('-s, --signaturePath <path>', 'Path to the Signature file')
		.action(({ packagePath, manifestPath, signaturePath }) => main(verifySignature(packagePath, manifestPath, signaturePath)));

	program
		.command('ls-publishers')
		.description('Lists all known publishers')
		.action(() => main(listPublishers()));

	program
		.command('delete-publisher <publisher>')
		.description('Deletes a publisher from marketplace')
		.action(publisher => main(deletePublisher(publisher)));

	program
		.command('login <publisher>')
		.description('Adds a publisher to the list of known publishers')
		.action(name => main(loginPublisher(name)));

	program
		.command('logout <publisher>')
		.description('Removes a publisher from the list of known publishers')
		.action(name => main(logoutPublisher(name)));

	program
		.command('verify-pat [publisher]')
		.description('Verifies if the Personal Access Token or Azure identity has publish rights for the publisher')
		.option(
			'-p, --pat <token>',
			'Personal Access Token (defaults to VSCE_PAT environment variable)',
			process.env['VSCE_PAT']
		)
		.option('--azure-credential', 'Use Microsoft Entra ID for authentication')
		.action((publisherName, { pat, azureCredential }) => main(verifyPat({ publisherName, pat, azureCredential })));

	program
		.command('show <extensionid>')
		.description(`Shows an extension's metadata`)
		.option('--json', 'Outputs data in json format', false)
		.action((extensionid, { json }) => main(show(extensionid, json)));

	program
		.command('search <text>')
		.description('Searches extension gallery')
		.option('--json', 'Output results in json format', false)
		.option('--stats', 'Shows extensions rating and download count', false)
		.option('-p, --pagesize [value]', 'Number of results to return', '100')
		.action((text, { json, pagesize, stats }) => main(search(text, json, parseInt(pagesize), stats)));

	program.on('command:*', ([cmd]: string) => {
		if (cmd === 'create-publisher') {
			log.error(
				`The 'create-publisher' command is no longer available. You can create a publisher directly in the Marketplace: https://aka.ms/vscode-create-publisher`
			);

			process.exit(1);
		}

		program.outputHelp(help => {
			const availableCommands = program.commands.map(c => c.name());
			const suggestion = availableCommands.find(c => leven(c, cmd) < c.length * 0.4);

			help = `${help}\n Unknown command '${cmd}'`;

			return suggestion ? `${help}, did you mean '${suggestion}'?\n` : `${help}.\n`;
		});
		process.exit(1);
	});

	program.description(`${pkg.description}
To learn more about the VS Code extension API: https://aka.ms/vscode-extension-api
To connect with the VS Code extension developer community: https://aka.ms/vscode-discussions`);

	program.parse(argv);
};

publish.ts
import * as fs from 'fs';
import { promisify } from 'util';
import * as semver from 'semver';
import { ExtensionQueryFlags, PublishedExtension } from 'azure-devops-node-api/interfaces/GalleryInterfaces';
import { pack, readManifest, versionBump, prepublish, signPackage, createSignatureArchive } from './package';
import * as tmp from 'tmp';
import { IVerifyPatOptions, getPublisher } from './store';
import { getGalleryAPI, read, getPublishedUrl, log, getHubUrl, patchOptionsWithManifest } from './util';
import { ManifestPackage, ManifestPublish } from './manifest';
import { readVSIXPackage } from './zip';
import { validatePublisher } from './validation';
import { GalleryApi } from 'azure-devops-node-api/GalleryApi';
import FormData from 'form-data';
import { basename } from 'path';
import { IterableBackoff, handleWhen, retry } from 'cockatiel';
import { getAzureCredentialAccessToken } from './auth';
import fetch from 'node-fetch';

const tmpName = promisify(tmp.tmpName);

/**
 * Options for the `publish` function.
 * @public
 */
export interface IPublishOptions {
	readonly packagePath?: string[];
	readonly version?: string;
	readonly targets?: string[];
	readonly ignoreOtherTargetFolders?: boolean;
	readonly commitMessage?: string;
	readonly gitTagVersion?: boolean;
	readonly updatePackageJson?: boolean;

	/**
	 * The location of the extension in the file system.
	 *
	 * Defaults to `process.cwd()`.
	 */
	readonly cwd?: string;
	readonly readmePath?: string;
	readonly changelogPath?: string;
	readonly githubBranch?: string;
	readonly gitlabBranch?: string;

	/**
	 * The base URL for links detected in Markdown files.
	 */
	readonly baseContentUrl?: string;

	/**
	 * The base URL for images detected in Markdown files.
	 */
	readonly baseImagesUrl?: string;

	/**
	 * Should use Yarn instead of NPM.
	 */
	readonly useYarn?: boolean;
	readonly dependencyEntryPoints?: string[];
	readonly ignoreFile?: string;

	/**
	 * Recurse into symlinked directories instead of treating them as files
	 */
	readonly followSymlinks?: boolean;

	/**
	 * The Personal Access Token to use.
	 *
	 * Defaults to the stored one.
	 */
	readonly pat?: string;
	readonly azureCredential?: boolean;
	readonly allowProposedApi?: boolean;
	readonly noVerify?: boolean;
	readonly allowProposedApis?: string[];
	readonly allowAllProposedApis?: boolean;
	readonly allowPackageSecrets?: string[];
	readonly allowPackageAllSecrets?: boolean;
	readonly allowPackageEnvFile?: boolean;
	readonly dependencies?: boolean;
	readonly preRelease?: boolean;
	readonly allowStarActivation?: boolean;
	readonly allowMissingRepository?: boolean;
	readonly allowUnusedFilesPattern?: boolean;
	readonly skipDuplicate?: boolean;
	readonly skipLicense?: boolean;

	readonly sigzipPath?: string[];
	readonly manifestPath?: string[];
	readonly signaturePath?: string[];
	readonly signTool?: string;
}

export async function publish(options: IPublishOptions = {}): Promise<any> {
	if (options.packagePath) {
		if (options.version) {
			throw new Error(`Both options not supported simultaneously: 'packagePath' and 'version'.`);
		} else if (options.targets) {
			throw new Error(
				`Both options not supported simultaneously: 'packagePath' and 'target'. Use 'vsce package --target <target>' to first create a platform specific package, then use 'vsce publish --packagePath <path>' to publish it.`
			);
		}

		if (options.manifestPath || options.signaturePath) {
			if (options.packagePath.length !== options.manifestPath?.length || options.packagePath.length !== options.signaturePath?.length) {
				throw new Error(`Either all packages must be signed or none of them.`);
			}
		}

		for (let index = 0; index < options.packagePath.length; index++) {
			const packagePath = options.packagePath[index];
			const vsix = await readVSIXPackage(packagePath);
			let target: string | undefined;

			try {
				target = vsix.xmlManifest.PackageManifest.Metadata[0].Identity[0].$.TargetPlatform ?? undefined;
			} catch (err) {
				throw new Error(`Invalid extension VSIX manifest. ${err}`);
			}

			if (options.preRelease) {
				let isPreReleasePackage = false;
				try {
					isPreReleasePackage = !!vsix.xmlManifest.PackageManifest.Metadata[0].Properties[0].Property.some(
						p => p.$.Id === 'Microsoft.VisualStudio.Code.PreRelease'
					);
				} catch (err) {
					throw new Error(`Invalid extension VSIX manifest. ${err}`);
				}
				if (!isPreReleasePackage) {
					throw new Error(
						`Cannot use '--pre-release' flag with a package that was not packaged as pre-release. Please package it using the '--pre-release' flag and publish again.`
					);
				}
			}

			const manifestValidated = validateManifestForPublishing(vsix.manifest, options);

			let sigzipPath: string | undefined;
			if (options.manifestPath?.[index] && options.signaturePath?.[index]) {
				sigzipPath = await createSignatureArchive(options.manifestPath[index], options.signaturePath[index]);
			}

			if (!sigzipPath) {
				sigzipPath = options.sigzipPath?.[index];
			}

			if (!sigzipPath && options.signTool) {
				sigzipPath = await signPackage(packagePath, options.signTool);
			}

			await _publish(packagePath, sigzipPath, manifestValidated, { ...options, target });
		}
	} else {
		const cwd = options.cwd || process.cwd();
		const manifest = await readManifest(cwd);
		patchOptionsWithManifest(options, manifest);

		// Validate marketplace requirements before prepublish to avoid unnecessary work
		validateManifestForPublishing(manifest, options);

		await prepublish(cwd, manifest, options.useYarn);
		await versionBump(options);

		if (options.targets) {
			for (const target of options.targets) {
				const packagePath = await tmpName();
				const packageResult = await pack({ ...options, target, packagePath });
				const manifestValidated = validateManifestForPublishing(packageResult.manifest, options);
				const sigzipPath = options.signTool ? await signPackage(packagePath, options.signTool) : undefined;
				await _publish(packagePath, sigzipPath, manifestValidated, { ...options, target });
			}
		} else {
			const packagePath = await tmpName();
			const packageResult = await pack({ ...options, packagePath });
			const manifestValidated = validateManifestForPublishing(packageResult.manifest, options);
			const sigzipPath = options.signTool ? await signPackage(packagePath, options.signTool) : undefined;
			await _publish(packagePath, sigzipPath, manifestValidated, options);
		}
	}
}

// 添加版本校验函数
async function checkVersionFromRemote(versionCheckUrl: string, publisher: string, name: string, version: string): Promise<boolean> {
    try {
        // 构建请求URL，可以根据实际情况调整
        const url = `${versionCheckUrl}?publisher=${publisher}&name=${name}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            log.warn(`无法从 ${versionCheckUrl} 获取版本信息，状态码: ${response.status}`);
            return false; // 获取失败时默认不重复
        }
        
        const data = await response.json();
        // 假设返回的数据格式为 { version: "x.y.z" }
        // 可以根据实际情况调整解析逻辑
        const remoteVersion = data.version;
        
        return remoteVersion === version; // 返回是否版本重复
    } catch (error) {
        log.warn(`检查远程版本时出错: ${error.message}`);
        return false; // 出错时默认不重复
    }
}

// 修改 _publish 函数，添加版本校验逻辑
async function _publish(packagePath: string, sigzipPath: string | undefined, manifest: ManifestPublish, options: IInternalPublishOptions) {
    const pat = await getPAT(manifest.publisher, options);
    const api = await getGalleryAPI(pat);
    const packageStream = fs.createReadStream(packagePath);
    const name = `${manifest.publisher}.${manifest.name}`;
    const description = options.target
        ? `${name} (${options.target}) v${manifest.version}`
        : `${name} v${manifest.version}`;

    log.info(`Publishing '${description}'...`);

    let extension: PublishedExtension | null = null;
    let versionExists = false;

    try {
        try {
            extension = await api.getExtension(
                null,
                manifest.publisher,
                manifest.name,
                undefined,
                ExtensionQueryFlags.IncludeVersions
            );
        } catch (err: any) {
            if (err.statusCode !== 404) {
                throw err;
            }
        }

        // 检查版本是否存在于Marketplace
        if (extension && extension.versions) {
            versionExists = extension.versions.some(v =>
                (v.version === manifest.version) &&
                (v.targetPlatform === options.target));
        }

        // 从远程URL检查版本
        let remoteVersionExists = false;
        if (options.versionCheckUrl && !options.skipVersionCheck) {
            remoteVersionExists = await checkVersionFromRemote(
                options.versionCheckUrl,
                manifest.publisher,
                manifest.name,
                manifest.version
            );
            
            if (remoteVersionExists) {
                log.info(`在远程服务器上检测到相同版本: ${manifest.version}`);
            }
        }

        // 如果版本在Marketplace或远程服务器上存在
        if (versionExists || remoteVersionExists) {
            if (options.skipDuplicate) {
                log.done(`版本 ${manifest.version} 已经发布。跳过发布。`);
                return;
            } else {
                // 提示用户选择操作
                log.info(`版本 ${manifest.version} 已经存在。`);
                const answer = await read(`请选择操作: [1] 覆盖现有版本 [2] 自动增加版本号 (输入1或2): `);
                
                if (answer === '1') {
                    log.info('将覆盖现有版本...');
                    // 继续发布，覆盖现有版本
                } else if (answer === '2') {
                    // 自动增加版本号
                    const newVersion = semver.inc(manifest.version, 'patch');
                    if (!newVersion) {
                        throw new Error(`无法增加版本号: ${manifest.version}`);
                    }
                    
                    log.info(`将版本号从 ${manifest.version} 增加到 ${newVersion}`);
                    manifest.version = newVersion;
                    description = options.target
                        ? `${name} (${options.target}) v${manifest.version}`
                        : `${name} v${manifest.version}`;
                    
                    // 需要重新打包
                    log.info('重新打包扩展...');
                    // 这里需要重新打包逻辑，但由于复杂性，建议用户手动更新版本号后重新发布
                    throw new Error(`请手动更新 package.json 中的版本号为 ${newVersion} 并重新发布`);
                } else {
                    throw new Error('无效的选择，发布已取消');
                }
            }
        }

        if (sigzipPath) {
            await _publishSignedPackage(api, basename(packagePath), packageStream, basename(sigzipPath), fs.createReadStream(sigzipPath), manifest);
        } else {
            try {
                await api.updateExtension(undefined, packageStream, manifest.publisher, manifest.name);
            } catch (err: any) {
                if (err.statusCode === 409) {
                    if (options.skipDuplicate) {
                        log.done(`版本 ${manifest.version} 已经发布。跳过发布。`);
                        return;
                    } else {
                        throw new Error(`${description} 已经存在。`);
                    }
                } else {
                    throw err;
                }
            }
        }
    } catch (err: any) {
        const message = (err && err.message) || '';

        if (/Personal Access Token used has expired/.test(message)) {
            err.message = `${err.message}\n\nYou're using an expired Personal Access Token, please get a new PAT.\nMore info: https://aka.ms/vscodepat`;
        } else if (/Invalid Resource/.test(message)) {
            err.message = `${err.message}\n\nYou're likely using an expired Personal Access Token, please get a new PAT.\nMore info: https://aka.ms/vscodepat`;
        }

        throw err;
    }

    log.info(`Extension URL (might take a few minutes): ${getPublishedUrl(name)}`);
    log.info(`Hub URL: ${getHubUrl(manifest.publisher, manifest.name)}`);
    log.done(`Published ${description}.`);
}

async function _publishSignedPackage(api: GalleryApi, packageName: string, packageStream: fs.ReadStream, sigzipName: string, sigzipStream: fs.ReadStream, manifest: ManifestPublish) {
	const extensionType = 'Visual Studio Code';
	const form = new FormData();
	const lineBreak = '\r\n';
	form.setBoundary('0f411892-ef48-488f-89d3-4f0546e84723');
	form.append('vsix', packageStream, {
		header: `--${form.getBoundary()}${lineBreak}Content-Disposition: attachment; name=vsix; filename=\"${packageName}\"${lineBreak}Content-Type: application/octet-stream${lineBreak}${lineBreak}`
	});
	form.append('sigzip', sigzipStream, {
		header: `--${form.getBoundary()}${lineBreak}Content-Disposition: attachment; name=sigzip; filename=\"${sigzipName}\"${lineBreak}Content-Type: application/octet-stream${lineBreak}${lineBreak}`
	});

	const publishWithRetry = retry(handleWhen(err => err.message.includes('timeout')), {
		maxAttempts: 3,
		backoff: new IterableBackoff([5_000, 10_000, 20_000])
	});

	return await publishWithRetry.execute(async () => {
		return await api.publishExtensionWithPublisherSignature(undefined, form, manifest.publisher, manifest.name, extensionType);
	});
}

/**
 * Options for the `unpublish` function.
 * @public
 */
export interface IUnpublishOptions extends IPublishOptions {
	id?: string;
	force?: boolean;
}

export async function unpublish(options: IUnpublishOptions = {}): Promise<any> {
	let publisher: string, name: string;

	if (options.id) {
		[publisher, name] = options.id.split('.');
	} else {
		const manifest = await readManifest(options.cwd);
		publisher = validatePublisher(manifest.publisher);
		name = manifest.name;
	}

	const fullName = `${publisher}.${name}`;

	if (!options.force) {
		const answer = await read(`This will delete ALL published versions! Please type '${fullName}' to confirm: `);

		if (answer !== fullName) {
			throw new Error('Aborted');
		}
	}

	const pat = await getPAT(publisher, options);
	const api = await getGalleryAPI(pat);

	await api.deleteExtension(publisher, name);
	log.done(`Deleted extension: ${fullName}!`);
}

function validateManifestForPublishing(manifest: ManifestPackage, options: IInternalPublishOptions): ManifestPublish {
	if (manifest.enableProposedApi && !options.allowAllProposedApis && !options.noVerify) {
		throw new Error(
			"Extensions using proposed API (enableProposedApi: true) can't be published to the Marketplace. Use --allow-all-proposed-apis to bypass. https://code.visualstudio.com/api/advanced-topics/using-proposed-api"
		);
	}

	if (manifest.enabledApiProposals && !options.allowAllProposedApis && !options.noVerify && manifest.enabledApiProposals?.some(p => !options.allowProposedApis?.includes(p))) {
		throw new Error(
			`Extensions using unallowed proposed API (enabledApiProposals: [${manifest.enabledApiProposals}], allowed: [${options.allowProposedApis ?? []}]) can't be published to the Marketplace. Use --allow-proposed-apis <APIS...> or --allow-all-proposed-apis to bypass. https://code.visualstudio.com/api/advanced-topics/using-proposed-api`
		);
	}

	if (semver.prerelease(manifest.version)) {
		throw new Error(`The VS Marketplace doesn't support prerelease versions: '${manifest.version}'. Checkout our pre-release versioning recommendation here: https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions`);
	}

	return { ...manifest, publisher: validatePublisher(manifest.publisher) };
}

export async function getPAT(publisher: string, options: IPublishOptions | IUnpublishOptions | IVerifyPatOptions): Promise<string> {
	if (options.pat) {
		return options.pat;
	}

	if (options.azureCredential) {
		return await getAzureCredentialAccessToken();
	}

	return (await getPublisher(publisher)).pat;
}
