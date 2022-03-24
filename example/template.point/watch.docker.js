#!/usr/bin/env node

const Bundler = require('parcel');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(__dirname, 'public');
const srcDir = path.join(__dirname, 'src');
const target = path.join(srcDir, 'index.html');
const options = {
    outDir,
    watch: true,
    cache: true,
    contentHash: false, // TODO: should be true
    minify: false,
    logLevel: 3,
    hmr: false,
    sourceMaps: true,
    hmrHostname: '',
    autoInstall: true,
};

const container = 'pointnetwork_website_owner';
const website = '/app/example/template.point';

const bundler = new Bundler(target, options);

bundler.on('buildStart', () => {
    console.info(execSync(
        `clear && cp -R ${ srcDir }/images ${ outDir }/.`
    ).toString());
});

bundler.on('buildEnd', () => {
    console.info(`\nDeploying to Point Network ${ container } node...\n`);
    console.info(execSync(
        `docker exec ${ container } /bin/bash -c '/app/point deploy "${ website }" --datadir "$DATADIR" -v'`
    ).toString());
});

bundler.serve();
