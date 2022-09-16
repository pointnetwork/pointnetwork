const parsePublicKey = (key) => {
    const matches = key.replace('0x', '').match(/.{1,8}/g);
    return matches ? matches.join(' ') : key;
};

export default parsePublicKey;
