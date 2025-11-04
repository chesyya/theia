// *****************************************************************************
// Copyright (C) 2019 Red Hat, Inc. and others.
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

import * as path from 'path';
import { URI } from './types-impl';
import { IconUrl, PluginPackage } from '../common/plugin-protocol';
import { Plugin } from '../common/plugin-api-rpc';

type SimpleIconPath = string | URI;
type ThemeIconPath = { light: string | URI, dark: string | URI };
type StateIconPath = SimpleIconPath | ThemeIconPath;

export type PluginIconPath = SimpleIconPath | ThemeIconPath | {
    default: StateIconPath,
    hover?: StateIconPath,
    active?: StateIconPath
};

export namespace PluginIconPath {
    export function toUrl(iconPath: unknown, plugin: Plugin): IconUrl | undefined {
        if (!is(iconPath)) {
            return undefined;
        }

        // Handle interactive icon path (with default, hover, active states)
        if (typeof iconPath === 'object' && 'default' in iconPath) {
            return {
                default: toThemeOrSimpleUrl(iconPath.default, plugin),
                hover: iconPath.hover ? toThemeOrSimpleUrl(iconPath.hover, plugin) : undefined,
                active: iconPath.active ? toThemeOrSimpleUrl(iconPath.active, plugin) : undefined
            };
        }

        // Handle theme icon path (with light and dark)
        if (typeof iconPath === 'object' && 'light' in iconPath) {
            return {
                light: asString(iconPath.light, plugin),
                dark: asString(iconPath.dark, plugin)
            };
        }

        // Handle simple string or URI
        return asString(iconPath, plugin);
    }

    /**
     * Convert a theme-aware or simple icon path to URL
     */
    function toThemeOrSimpleUrl(
        iconPath: StateIconPath,
        plugin: Plugin
    ): string | { light: string; dark: string } {
        if (typeof iconPath === 'object' && 'light' in iconPath) {
            return {
                light: asString(iconPath.light, plugin),
                dark: asString(iconPath.dark, plugin)
            };
        }
        return asString(iconPath as SimpleIconPath, plugin);
    }

    export function is(item: unknown): item is PluginIconPath {
        if (typeof item === 'string' || item instanceof URI) {
            return true;
        }
        if (typeof item === 'object' && !!item) {
            // Check for theme icon path
            if ('light' in item && 'dark' in item) {
                return true;
            }
            // Check for interactive icon path
            if ('default' in item) {
                return true;
            }
        }
        return false;
    }

    export function asString(arg: string | URI, plugin: Plugin): string {
        arg = arg instanceof URI && arg.scheme === 'file' ? arg.fsPath : arg;
        if (typeof arg !== 'string') {
            return arg.toString(true);
        }
        const { packagePath } = plugin.rawModel;
        const absolutePath = path.isAbsolute(arg) ? arg : path.join(packagePath, arg);
        const normalizedPath = path.normalize(absolutePath);
        const relativePath = path.relative(packagePath, normalizedPath);
        return PluginPackage.toPluginUrl(plugin.rawModel, relativePath);
    }
}
