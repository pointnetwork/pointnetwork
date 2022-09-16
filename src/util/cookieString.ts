/**
 * Converts a "cookie string" into an object.
 *
 * Example of cookie string:
 *     key1=value1;key2=value2;key3=value3
 */
export function parseCookieString(str: string): Record<string, string> {
    const pairs = str.split(';');
    const map: Record<string, string> = {};

    pairs.forEach(pair => {
        const keyvalue = pair.split('=');
        if (keyvalue.length === 2) {
            const k = typeof keyvalue[0] === 'string' && keyvalue[0].trim();
            const v = typeof keyvalue[1] === 'string' && keyvalue[1].trim();
            if (k && v) {
                map[k] = v;
            }
        }
    });

    return map;
}

/**
 * Converts an object into a "cookie string".
 *
 * Example of cookie string:
 *     key1=value1;key2=value2;key3=value3
 */
export function encodeCookieString(obj: Record<string, string>): string {
    let cookieStr = '';
    Object.entries(obj).forEach(e => (cookieStr += `${e[0]}=${e[1]};`));
    cookieStr = cookieStr.replace(/;$/, ''); // remove trailing semi-colon
    return cookieStr;
}

/**
 * Merges a new object with an existing "cookie string",
 * making sure not to duplicate any keys.
 */
export function merge(old: string, obj: Record<string, string>): Record<string, string> {
    const prevData = parseCookieString(old);

    // If there's a pn_alias, there cannot be pn_root + pn_routes (and viceversa)
    if (obj.pn_alias) {
        delete prevData.pn_root;
        delete prevData.pn_routes;
    } else if (obj.pn_root) {
        delete prevData.pn_alias;
    }

    return {...prevData, ...obj};
}
