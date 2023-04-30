module.exports = {
    presets: [
        ['@babel/preset-env', {targets: {node: 'current'}}],
        ['@babel/preset-typescript', {allowDeclareFields: true}]
    ],
    plugins: [
        ['@babel/plugin-transform-modules-commonjs', {allowTopLevelThis: true}],
        '@babel/plugin-syntax-dynamic-import'
    ]
};
