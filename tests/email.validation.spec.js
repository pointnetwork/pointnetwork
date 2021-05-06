const bytes = s => s
const bytes1 = int => String.fromCharCode(int)
const uint8 = hex => parseInt(hex, 10)
const MAX_EMAIL_LENGTH = 32

function _isValidEmail(str) {
    const bstr = bytes(str);

    if((bstr.length > MAX_EMAIL_LENGTH) || (bstr[0] == bytes1(uint8(0x2E)))) { // '.'
        return false;
    }

    let localPartComplete = false;
    let domainComplete = false; // currently sub-domains are not supported
    let topLevelDomainComplete = false;

    let localPartLength = 0;
    let domainLength = 0;
    let topLevelDomainLength = 0;

    for (let i = 0; i < bstr.length; i++) {
        const char = bstr[i];

        if (localPartComplete) {
            if (domainComplete) {
                if (char == bytes1(uint8(0x5A)) || char == bytes1(uint8(0x7A))) { // 'z' or 'Z'
                    topLevelDomainComplete = true;
                }
                if (topLevelDomainLength > 0) {
                    return false;
                }
                topLevelDomainLength++;
            } else if (char == bytes1(uint8(0x2E))) { // '.'
                domainComplete = true;
            } else if (
                !_isAlphaNumeric(char) &&
                !(char == bytes1(uint8(0x5f))) && // '_'
                !(char == bytes1(uint8(0x2D)))    // '-'
            ) {
                return false;
            } else {
                domainLength++;
            }
        } else if (char == bytes1(uint8(0x40))) { // '@'
            if ((i == 0) || (bstr[i - 1] == bytes1(uint8(0x2E)))) { // '.'
                return false;
            }
            localPartComplete = true;
        } else if (
            !_isAlphaNumeric(char) &&
            !(char == bytes1(uint8(0x2E))) && // '.'
            !(char == bytes1(uint8(0x2B))) && // '+'
            !(char == bytes1(uint8(0x5f))) && // '_'
            !(char == bytes1(uint8(0x2D)))    // '-'
        ) {
            return false;
        } else if (
            (i > 0) &&
            (char == bytes1(uint8(0x2E))) &&     // '.'
            (bstr[i - 1] == bytes1(uint8(0x2E))) // '.'
        ) {
            return false;
        } else {
            localPartLength++;
        }
    }

    return (
        localPartComplete && localPartLength > 0 &&
        domainComplete && domainLength > 0 &&
        topLevelDomainComplete && topLevelDomainLength == 1
    );
}

function _isAlphaNumeric(char) {
    return (
        (char >= bytes1(uint8(0x30)) && char <= bytes1(uint8(0x39))) || // 9-0
        (char >= bytes1(uint8(0x41)) && char <= bytes1(uint8(0x5A))) || // A-Z
        (char >= bytes1(uint8(0x61)) && char <= bytes1(uint8(0x7A))) // a-z
    );
}

describe('Email validation', () => {
    test('should validate email address according to a set of common rules', () => {
        expect(_isValidEmail('foo@bar.z')).toEqual(true);
        expect(_isValidEmail('foo@bar_baz.z')).toEqual(true);
        expect(_isValidEmail('foo@bar-bah.z')).toEqual(true);
        expect(_isValidEmail('foo-bah@bar.z')).toEqual(true);
        expect(_isValidEmail('foo_baz@bar.z')).toEqual(true);
        expect(_isValidEmail('foo.baz@bar.z')).toEqual(true);
        expect(_isValidEmail('foo+baz@bar.z')).toEqual(true);
        expect(_isValidEmail('foo+baz+bah@bar.z')).toEqual(true);
        expect(_isValidEmail('foo.b.a.z@bar.z')).toEqual(true);
        expect(_isValidEmail('foo-b-a-z@bar.z')).toEqual(true);
        expect(_isValidEmail('foo_b_a_z@bar.z')).toEqual(true);
        expect(_isValidEmail('1234567890@bar.z')).toEqual(true);
        expect(_isValidEmail('_f2oo+baz.BAh-4@bar.z')).toEqual(true);

        expect(_isValidEmail('foo@bar.x')).toEqual(false);
        expect(_isValidEmail('foo@baz@bar.x')).toEqual(false);
        expect(_isValidEmail('foo@bar')).toEqual(false);
        expect(_isValidEmail('foobar.z')).toEqual(false);
        expect(_isValidEmail('foo@bar.')).toEqual(false);
        expect(_isValidEmail('foo@bar.zx')).toEqual(false);
        expect(_isValidEmail('foo@ba+r.z')).toEqual(false);
        expect(_isValidEmail('foo@bar..z')).toEqual(false);
        expect(_isValidEmail('foo@bar.baz.z')).toEqual(false);
        expect(_isValidEmail('foo.@bar.z')).toEqual(false);
        expect(_isValidEmail('foo.@bar.z')).toEqual(false);
        expect(_isValidEmail('foo.@bar.z')).toEqual(false);
        expect(_isValidEmail('.foo@bar.z')).toEqual(false);
        expect(_isValidEmail('fo..o@bar.z')).toEqual(false);
        expect(_isValidEmail('@bar.z')).toEqual(false);
        expect(_isValidEmail('foo@.z')).toEqual(false);
    })
})
