module.exports = {
    'env': {
        'node': true,
        'es2021': true,
        'mocha': true
    },
    'extends': [
        // 'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
        'prettier',
        'plugin:import/recommended'
    ],
    // 'parser': '@typescript-eslint/parser',
    'plugins': [
        // '@typescript-eslint',
        'prettier',
        'import',
        'filenames',
        'prefer-arrow'
    ],
    'ignorePatterns': [],
    'rules': {
        'no-implicit-coercion': ['error'],
        'indent': ['error', 4, {'SwitchCase': 1}], // This should be in sync with prettier config
        'semi': ['error', 'always'],
        'prettier/prettier': ['error', {'usePrettierrc': true}],
        'indent': 'off',
        'linebreak-style': ['error', 'unix'],
        'no-fallthrough': 'off',
        'no-console': 'error',
        'no-debugger': 'error',
        'no-unused-vars': 'error',
        'max-len': ['warn', {
            'code': 100, // This should be in sync with prettier config
            'ignoreStrings': true,
            'ignoreRegExpLiterals': true,
            'ignoreTemplateLiterals': true,
            'tabWidth': 4,
            'ignoreComments': false
        }],
        'comma-dangle': ['error', 'never'], // This should be in sync with prettier config
        'space-in-parens': ['error', 'never'], // This should be in sync with prettier config
        'comma-spacing': 'error',
        'object-curly-spacing': ['error', 'never'], // This should be in sync with prettier config
        'array-bracket-spacing': ['error', 'never'], // This should be in sync with prettier config
        'eqeqeq': ['error', 'always'],
        'no-useless-call': 'error',
        'prefer-promise-reject-errors': 'error',
        'no-underscore-dangle': 'error',
        'prefer-const': ['error', {'destructuring': 'all', 'ignoreReadBeforeAssign': false}],
        'import/no-extraneous-dependencies': 'error',
        'import/imports-first': ['error', 'absolute-first'],
        'import/extensions': ['error', 'never'],
        'import/no-unresolved': 'off',
        'filenames/match-regex': 'error',
        'filenames/match-exported': 'error',
        'no-bitwise': 'off',
        'no-caller': 'error',
        'no-useless-return': 'error',
        'no-duplicate-imports': 'error',
        'no-unused-expressions': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow/prefer-arrow-functions': ['error', {
            'disallowPrototype': true,
            'singleReturnOnly': false,
            'classPropertiesAllowed': false
        }],
        'brace-style': ['error', '1tbs', {'allowSingleLine': true}],
        'space-infix-ops': ['error'],
        'quote-props': ['error', 'consistent-as-needed'], // This should be in sync with prettier config
        'no-multiple-empty-lines': ['warn', {'max': 1, 'maxEOF': 0}],
        'quotes': ['error', 'single', {'allowTemplateLiterals': true}]
        // '@typescript-eslint/no-var-requires': 'error', // If we decide to proceed with TS
        // '@typescript-eslint/ban-ts-comment': 'error', // If we decide to proceed with TS
        // '@typescript-eslint/no-non-null-assertion': 'off', // If we decide to proceed with TS
        // '@typescript-eslint/no-shadow': 'error',
        // '@typescript-eslint/no-unused-vars': 'error'
        // 'no-shadow': 'off',
    }
}
