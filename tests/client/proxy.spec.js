const ZProxy = require('../../client/proxy');

describe("Client/ZProxy", () => {
    test("it should correctly sanitize the text/html inputs", () => {
        const tests = {
            "<script></script>": "",
            "<script language='javascript'></script>": "",
            "<xml></xml>": "",
            "<invalid-tag></invalid-tag>": "",
            '<a href="https://google.com" invalid-attr="5">Test</a>': '<a href="https://google.com">Test</a>',
        };

        const testsIdentical = [
            "",
            "<html><body></body></html>",
            '<a href="https://google.com">Test</a>',
        ];

        mockedCtx = {
            config: {
                client: {
                    zproxy: {
                        port: 0
                    }
                },
            },
        };
        zproxy = new ZProxy(mockedCtx);

        for(let input in tests) {
            let expectedOutput = tests[input];
            expect(zproxy.sanitize(input)).toEqual(expectedOutput);
        }

        testsIdentical.forEach((input) => {
            expect(zproxy.sanitize(input)).toEqual(input);
        });
    });
});
