module.exports = {
    env: {
        node: true,
        es2021: true,
        mocha: true
    },
    extends: [
        // 'plugin:@typescript-eslint/recommended',
        // 'plugin:import/recommended'``
    ],
    // 'parser': '@typescript-eslint/parser',
    plugins: [
        // '@typescript-eslint',
        // 'import',
        'filenames',
        'prefer-arrow'
    ],
    ignorePatterns: [],
    rules: {
        'no-implicit-coercion': ['error'],
        'indent': ['error', 4, {
            SwitchCase: 1,
            MemberExpression: 1,
            ArrayExpression: 1,
            ObjectExpression: 1,
            VariableDeclarator: 1,
            CallExpression: {arguments: 1},
            offsetTernaryExpressions: true
        }],
        'semi': ['error', 'always'],
        'linebreak-style': ['error', 'unix'],
        'no-fallthrough': 'off',
        'no-console': 'error',
        'no-debugger': 'error',
        'no-unused-vars': 'error',
        'max-len': ['warn', {
            code: 100,
            ignoreStrings: true,
            ignoreRegExpLiterals: true,
            ignoreTemplateLiterals: true,
            tabWidth: 4,
            ignoreComments: false
        }],
        'comma-dangle': ['error', 'never'],
        'space-in-parens': ['error', 'never'],
        'comma-spacing': 'error',
        'object-curly-spacing': ['error', 'never'],
        'object-curly-newline': ['error', {multiline: true}],
        'array-bracket-spacing': ['error', 'never'],
        'eqeqeq': ['error', 'always'],
        'no-useless-call': 'error',
        'prefer-promise-reject-errors': 'error',
        'no-underscore-dangle': 'error',
        'prefer-const': ['error', {destructuring: 'all', ignoreReadBeforeAssign: false}],
        // 'filenames/match-regex': 'error',
        // 'filenames/match-exported': 'error',
        'no-bitwise': 'off',
        'no-caller': 'error',
        'no-useless-return': 'error',
        'no-duplicate-imports': 'error',
        'no-unused-expressions': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow/prefer-arrow-functions': ['error', {
            disallowPrototype: true,
            singleReturnOnly: false,
            classPropertiesAllowed: false
        }],
        'brace-style': ['error', '1tbs', {allowSingleLine: true}],
        'space-infix-ops': ['error'],
        'quote-props': ['error', 'consistent-as-needed'],
        'no-multiple-empty-lines': ['warn', {max: 1, maxEOF: 0}],
        'quotes': ['error', 'single', {allowTemplateLiterals: true}],
        'no-eval': 'error',
        'no-implied-eval': 'error'
        // '@typescript-eslint/no-var-requires': 'error', // If we decide to proceed with TS
        // '@typescript-eslint/ban-ts-comment': 'error', // If we decide to proceed with TS
        // '@typescript-eslint/no-non-null-assertion': 'off', // If we decide to proceed with TS
        // '@typescript-eslint/no-shadow': 'error',
        // '@typescript-eslint/no-unused-vars': 'error'
        // 'no-shadow': 'off',
        // 'import/no-extraneous-dependencies': 'error',
        // 'import/imports-first': ['error', 'absolute-first'],
        // 'import/extensions': ['error', 'never'],
        // 'import/no-unresolved': 'off',
    }
};
