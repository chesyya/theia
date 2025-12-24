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

        // 处理交互类型icon path
        if (typeof iconPath === 'object' && 'default' in iconPath) {
            return {
                default: toThemeOrSimpleUrl(iconPath.default, plugin),
                hover: iconPath.hover ? toThemeOrSimpleUrl(iconPath.hover, plugin) : undefined,
                active: iconPath.active ? toThemeOrSimpleUrl(iconPath.active, plugin) : undefined
            };
        }

        // 处理主题类型icon path
        if (typeof iconPath === 'object' && 'light' in iconPath) {
            return {
                light: asString(iconPath.light, plugin),
                dark: asString(iconPath.dark, plugin)
            };
        }

        // 处理简单icon path
        return asString(iconPath, plugin);
    }

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
            if ('light' in item && 'dark' in item) {
                return true;
            }
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
