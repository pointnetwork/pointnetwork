module.exports = {
    extends: [
        'eslint:recommended',
        'prettier',
        'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
        'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    ignorePatterns: ['.eslintrc.js'],
    env: {
        es6: true,
        browser: true
    },
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
        ecmaFeatures: {
            jsx: true, // Allows for the parsing of JSX
        }
    },
    // parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    settings: {
        react: {
            version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
        },
    },
    rules: {
        // 'react/prop-types': 0, // no requiring of prop types
        'react/display-name': 0, // allow anonymous components
        'strict': [2, 'safe'],
        'no-debugger': 2,
        'brace-style': [2, '1tbs', { 'allowSingleLine': true }],
        'no-trailing-spaces': [2, { 'skipBlankLines': true }],
        'keyword-spacing': 2,
        'spaced-comment': [2, 'always'],
        'vars-on-top': 0, // Disable: all 'var' declarations must be at the top of the function scope
        'no-undef': 0,
        'no-undefined': 0,
        'comma-dangle': [0, 'never'],
        'quotes': [2, 'double'],
        'semi': 1,
        'guard-for-in': 0, // allow iterating with for..in without checking for Object.hasOwnProperty
        'no-eval': 2,
        'no-with': 2,
        'valid-typeof': 2,
        'no-unused-vars': 'error',
        'no-continue': 1,
        'no-unreachable': 1,
        'no-unused-expressions': 1,
        'no-magic-numbers': 0,
        'no-inner-declarations': 0,
        'no-constant-condition': 0,
        'no-empty-function': 0,
        'max-len': [1, 120, 4],
        'react/prefer-es6-class': 1,
        'react/react-in-jsx-scope': 0,
        'react/prop-types': 0
    },
};
