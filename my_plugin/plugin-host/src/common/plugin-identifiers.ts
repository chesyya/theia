export namespace PluginIdentifiers {
    export interface Components {
        publisher?: string;
        name: string;
        version: string;
    }

    export interface IdAndVersion {
        id: UnversionedId;
        version: string;
    }

    export type VersionedId = `${string}.${string}@${string}`;
    export type UnversionedId = `${string}.${string}`;
    /** Unpublished plugins (not from Open VSX or VSCode plugin store) may not have a `publisher` field. */
    export const UNPUBLISHED = '<unpublished>';

    /**
     * @returns a string in the format `<publisher>.<name>`
     */
    export function componentsToUnversionedId({ publisher = UNPUBLISHED, name }: Components): UnversionedId {
        return `${publisher}.${name}`;
    }
    /**
     * @returns a string in the format `<publisher>.<name>@<version>`.
     */
    export function componentsToVersionedId({ publisher = UNPUBLISHED, name, version }: Components): VersionedId {
        return `${publisher}.${name}@${version}`;
    }
    export function componentsToVersionWithId(components: Components): IdAndVersion {
        return { id: componentsToUnversionedId(components), version: components.version };
    }
    /**
     * @returns a string in the format `<id>@<version>`.
     */
    export function idAndVersionToVersionedId({ id, version }: IdAndVersion): VersionedId {
        return `${id}@${version}`;
    }
    /**
     * @returns a string in the format `<publisher>.<name>`.
     */
    export function unversionedFromVersioned(id: VersionedId): UnversionedId {
        const endOfId = id.indexOf('@');
        return id.slice(0, endOfId) as UnversionedId;
    }
    /**
     * @returns `undefined` if it looks like the string passed in does not have the format returned by {@link PluginIdentifiers.toVersionedId}.
     */
    export function identifiersFromVersionedId(probablyId: string): Components | undefined {
        const endOfPublisher = probablyId.indexOf('.');
        const endOfName = probablyId.indexOf('@', endOfPublisher);
        if (endOfPublisher === -1 || endOfName === -1) {
            return undefined;
        }
        return { publisher: probablyId.slice(0, endOfPublisher), name: probablyId.slice(endOfPublisher + 1, endOfName), version: probablyId.slice(endOfName + 1) };
    }
    /**
     * @returns `undefined` if it looks like the string passed in does not have the format returned by {@link PluginIdentifiers.toVersionedId}.
     */
    export function idAndVersionFromVersionedId(probablyId: string): IdAndVersion | undefined {
        const endOfPublisher = probablyId.indexOf('.');
        const endOfName = probablyId.indexOf('@', endOfPublisher);
        if (endOfPublisher === -1 || endOfName === -1) {
            return undefined;
        }
        return { id: probablyId.slice(0, endOfName) as UnversionedId, version: probablyId.slice(endOfName + 1) };
    }
}
