const separator = '/';

export function normalize(path: string): string {
    if (!path || path.length === 0) {
        return '.';
    }

    const isAbsolute = path.charCodeAt(0) === 47;
    const trailingSlash = path.charCodeAt(path.length - 1) === 47;

    const parts = path.split(separator);

    const result: string[] = [];

    for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p === '') {
            continue;
        }

        if (p === '..') {
            result.pop();
            continue;
        }

        result.push(p);
    }

    if (result.length === 0) {
        return '.';
    }

    path = result.join(separator);
    if (isAbsolute) {
        path = '/' + path;
    }

    if (trailingSlash) {
        path += '/';
    }

    return path;
}

export function join(...paths: string[]): string {
    if (paths.length === 0) {
        return '.';
    }

    const path = paths.join(separator);
    return normalize(path);
}
