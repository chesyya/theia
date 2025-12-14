/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// code copied and modified from https://github.com/microsoft/vscode/blob/release/1.93/src/vscode-dts/vscode.proposed.createFileSystemWatcher.d.ts

declare module '@baosky/plugin'  {

    export interface FileSystemWatcherOptions {

        /**
         * Ignore when files have been created.
         */
        readonly ignoreCreateEvents?: boolean;

        /**
         * Ignore when files have been changed.
         */
        readonly ignoreChangeEvents?: boolean;

        /**
         * Ignore when files have been deleted.
         */
        readonly ignoreDeleteEvents?: boolean;

        /**
         * An optional set of glob patterns to exclude from watching.
         * Glob patterns are always matched relative to the watched folder.
         */
        readonly excludes: string[];
    }

    export namespace workspace {

        /**
         * A variant of {@link workspace.createFileSystemWatcher} that optionally allows to specify
         * a set of glob patterns to exclude from watching.
         *
         * It provides the following advantages over the other {@link workspace.createFileSystemWatcher}
         * method:
         * - the configured excludes from `files.watcherExclude` setting are NOT applied
         * - requests for recursive file watchers inside the opened workspace are NOT ignored
         * - the watcher is ONLY notified for events from this request and not from any other watcher
         *
         * As such, this method is prefered in cases where you want full control over the watcher behavior
         * without being impacted by settings or other watchers that are installed.
         */
        export function createFileSystemWatcher(pattern: RelativePattern, options?: FileSystemWatcherOptions): FileSystemWatcher;
    }
}
