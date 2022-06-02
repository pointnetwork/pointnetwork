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
