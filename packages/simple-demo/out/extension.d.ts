/// <reference types="@theia/plugin/src/theia.proposed.debugVisualization" />
/// <reference types="@theia/plugin/src/theia.proposed.multiDocumentHighlightProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookCellExecutionState" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookKernelSource" />
/// <reference types="@theia/plugin/src/theia.proposed.notebookMessaging" />
/// <reference types="@theia/plugin/src/theia.proposed.portsAttributes" />
/// <reference types="@theia/plugin/src/theia.proposed.scmProviderOptions" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalCompletionProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.textEditorDiffInformation" />
/// <reference types="@theia/plugin/src/theia-extra" />
/// <reference types="@theia/plugin/src/theia.proposed.canonicalUriProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.customEditorMove" />
/// <reference types="@theia/plugin/src/theia.proposed.diffCommand" />
/// <reference types="@theia/plugin/src/theia.proposed.editSessionIdentityProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.extensionsAny" />
/// <reference types="@theia/plugin/src/theia.proposed.externalUriOpener" />
/// <reference types="@theia/plugin/src/theia.proposed.findTextInFiles" />
/// <reference types="@theia/plugin/src/theia.proposed.fsChunks" />
/// <reference types="@theia/plugin/src/theia.proposed.interactiveWindow" />
/// <reference types="@theia/plugin/src/theia.proposed.mappedEditsProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.profileContentHandlers" />
/// <reference types="@theia/plugin/src/theia.proposed.resolvers" />
/// <reference types="@theia/plugin/src/theia.proposed.scmValidation" />
/// <reference types="@theia/plugin/src/theia.proposed.shareProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.terminalQuickFixProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.textSearchProvider" />
/// <reference types="@theia/plugin/src/theia.proposed.timeline" />
/**
 * Simple Demo Plugin - VS Code Compatible
 * 使用 activate/deactivate 生命周期
 */
import * as theia from '@theia/plugin';
export declare function activate(context: theia.PluginContext): void;
export declare function deactivate(): void;
