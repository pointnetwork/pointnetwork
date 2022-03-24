const bytes = s => s;
const bytes1 = int => String.fromCharCode(int);
const uint8 = hex => parseInt(hex, 10);
const MAX_EMAIL_LENGTH = 32;

function _isValidEmail(str) {
    const bstr = bytes(str);

    if (bstr.length > MAX_EMAIL_LENGTH || bstr[0] === bytes1(uint8(0x2e))) {
        // '.'
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
                if (char === bytes1(uint8(0x5a)) || char === bytes1(uint8(0x7a))) {
                    // 'z' or 'Z'
                    topLevelDomainComplete = true;
                }
                if (topLevelDomainLength > 0) {
                    return false;
                }
                topLevelDomainLength++;
            } else if (char === bytes1(uint8(0x2e))) {
                // '.'
                domainComplete = true;
            } else if (
                !_isAlphaNumeric(char) &&
                !(char === bytes1(uint8(0x5f))) && // '_'
                !(char === bytes1(uint8(0x2d))) // '-'
            ) {
                return false;
            } else {
                domainLength++;
            }
        } else if (char === bytes1(uint8(0x40))) {
            // '@'
            if (i === 0 || bstr[i - 1] === bytes1(uint8(0x2e))) {
                // '.'
                return false;
            }
            localPartComplete = true;
        } else if (
            !_isAlphaNumeric(char) &&
            !(char === bytes1(uint8(0x2e))) && // '.'
            !(char === bytes1(uint8(0x2b))) && // '+'
            !(char === bytes1(uint8(0x5f))) && // '_'
            !(char === bytes1(uint8(0x2d))) // '-'
        ) {
            return false;
        } else if (
            i > 0 &&
            char === bytes1(uint8(0x2e)) && // '.'
            bstr[i - 1] === bytes1(uint8(0x2e)) // '.'
        ) {
            return false;
        } else {
            localPartLength++;
        }
    }

    return (
        localPartComplete &&
        localPartLength > 0 &&
        domainComplete &&
        domainLength > 0 &&
        topLevelDomainComplete &&
        topLevelDomainLength === 1
    );
}

function _isAlphaNumeric(char) {
    return (
        (char >= bytes1(uint8(0x30)) && char <= bytes1(uint8(0x39))) || // 9-0
        (char >= bytes1(uint8(0x41)) && char <= bytes1(uint8(0x5a))) || // A-Z
        (char >= bytes1(uint8(0x61)) && char <= bytes1(uint8(0x7a))) // a-z
    );
}

describe('Email validation', () => {
    test('should validate email address according to a set of common rules', () => {
        expect.assertions(29);

        expect(_isValidEmail('foo@bar.point')).toEqual(true);
        expect(_isValidEmail('foo@bar_baz.point')).toEqual(true);
        expect(_isValidEmail('foo@bar-bah.point')).toEqual(true);
        expect(_isValidEmail('foo-bah@bar.point')).toEqual(true);
        expect(_isValidEmail('foo_baz@bar.point')).toEqual(true);
        expect(_isValidEmail('foo.baz@bar.point')).toEqual(true);
        expect(_isValidEmail('foo+baz@bar.point')).toEqual(true);
        expect(_isValidEmail('foo+baz+bah@bar.point')).toEqual(true);
        expect(_isValidEmail('foo.b.a.z@bar.point')).toEqual(true);
        expect(_isValidEmail('foo-b-a-z@bar.point')).toEqual(true);
        expect(_isValidEmail('foo_b_a_z@bar.point')).toEqual(true);
        expect(_isValidEmail('1234567890@bar.point')).toEqual(true);
        expect(_isValidEmail('_f2oo+baz.BAh-4@bar.point')).toEqual(true);

        expect(_isValidEmail('foo@bar.x')).toEqual(false);
        expect(_isValidEmail('foo@baz@bar.x')).toEqual(false);
        expect(_isValidEmail('foo@bar')).toEqual(false);
        expect(_isValidEmail('foobar.point')).toEqual(false);
        expect(_isValidEmail('foo@bar.')).toEqual(false);
        expect(_isValidEmail('foo@bar.pointx')).toEqual(false);
        expect(_isValidEmail('foo@ba+r.point')).toEqual(false);
        expect(_isValidEmail('foo@bar..point')).toEqual(false);
        expect(_isValidEmail('foo@bar.baz.point')).toEqual(false);
        expect(_isValidEmail('foo.@bar.point')).toEqual(false);
        expect(_isValidEmail('foo.@bar.point')).toEqual(false);
        expect(_isValidEmail('foo.@bar.point')).toEqual(false);
        expect(_isValidEmail('.foo@bar.point')).toEqual(false);
        expect(_isValidEmail('fo..o@bar.point')).toEqual(false);
        expect(_isValidEmail('@bar.point')).toEqual(false);
        expect(_isValidEmail('foo@.point')).toEqual(false);
    });
});
