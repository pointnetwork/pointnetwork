/**
 * Compares two arrays for strict equality at every index.
 */
export function areScalarArraysEqual<T>(a1: T[], a2: T[]) {
    // todo: i feel like there could be some vulnerability hidden here... create more robust function but fast, without overhead of JSON.stringify
    if (typeof a1 !== typeof a2) return false;
    if (typeof a1 !== 'object') return false;
    if (a1.length !== a2.length) return false;
    for (const i in a1) {
        if (a1[i] !== a2[i]) return false;
    }
    return true;
}
