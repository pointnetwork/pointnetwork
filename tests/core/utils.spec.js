const utils = require('../../core/utils');

describe("Core/Utils", () => {
    // todo: test for null, Object, integers etc. - ideally it should throw errors
    test("sha256 functions should correctly calculate hashes", () => {
        const vectors = {
            '': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            '1': '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
        };

        for(let input in vectors) {
            let expectedOutput = vectors[input];
            expect(utils.sha256hex(input)).toEqual(expectedOutput);
            expect(utils.sha256(input)).toEqual(Buffer.from(expectedOutput, 'hex'));
        }
    });

    test("hashFn functions should correctly calculate id hashes", () => {
        const vectors = {
            '': 'dcc703c0e500b653ca82273b7bfad8045d85a470',
            '1': '82df0950f5a951637e0307cdcb4c672f298b8bc6',
        };

        for(let input in vectors) {
            let expectedOutput = vectors[input];
            expect(utils.hashFnUtf8Hex(input)).toEqual(expectedOutput);
            expect(utils.hashFn(input)).toEqual(Buffer.from(expectedOutput, 'hex'));
        }
    });
});
