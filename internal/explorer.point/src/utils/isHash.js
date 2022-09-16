const isHash = (str) => {
    const s = str.startsWith('0x') ? str.substr(2) : str;
    if (s.length !== 64) return false;
    return new RegExp('^[0-9a-fA-F]+$').test(s);
};

export default isHash;
