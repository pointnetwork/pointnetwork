import {match} from 'node-match-path';
import mimeTypes from 'mime-types';

export const getParamsAndTemplate = (routes: Record<string, string>, path: string) => {
    let routeParams: Record<string, string> | null = null;
    let templateFilename = null;
    for (const k in routes) {
        const matched = match(k, path);
        if (matched.matches) {
            routeParams = matched.params;
            templateFilename = routes[k];
            break;
        }
    }
    return {
        routeParams,
        templateFilename
    };
};

export const getContentTypeFromExt = (ext: string) => {
    if (ext === 'zhtml') {
        ext = 'html';
    }
    return mimeTypes.lookup('.' + ext) ?? 'application/octet-stream';
};

export const isDirectoryJson = (text: string) => {
    try {
        const obj = JSON.parse(text);
        return obj.type && obj.type === 'dir';
    } catch (e) {
        return false;
    }
};
