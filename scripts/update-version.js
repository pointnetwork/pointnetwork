#!/usr/bin/env node

// - Leverages `npm version` script which creates a new tag
// - Updates package.json, adding this new version
// - And changes the version in .env file
// - Pushes the tag to the repository
// A new docker image will be built with Github Actions after that

// todo: Currently, the image rebuilding action is triggered on *any* tag being pushed from any branch

const version = process.argv[2];

if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(
        `Unsupported version format: "${version}". ` +
            `Please provide a unique sequence of major, minor and build version identifiers.`
    );
}

const varName = 'POINT_NODE_VERSION';
const envFile = '.env';
const envPath = require('path').resolve(__dirname, '..', envFile);
const {execSync} = require('child_process');

try {
    execSync(`npm version ${version}`).toString();
    execSync(`sed -i '' 's/${varName}=.*$/${varName}=v${version}/' ${envPath}`).toString();

    if (execSync('git diff --name-only').toString().includes(envFile)) {
        execSync(`git add ${envPath}`).toString();
        execSync(`git commit --amend -C $(git log -1 --pretty=format:"%H")`).toString();
    }

    execSync(`git push && git push origin v${version}`).toString();
    console.info(`Successfully pushed new version tag "v${version}".`);
} catch (e) {
    console.error(
        (e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || e.toString()
    );
    throw e;
}
