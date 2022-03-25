#!/usr/bin/env node

const Docker = require('dockerode');
const {promisify} = require('util');
const {exec} = require('child_process');
const DELAY_TIME = 10; //seconds
const TEST_CONTAINER = 'pointnetwork-test-1';

function delay(time) {
    return new Promise((res) => setTimeout(res, time * 1000));
}

const docker = new Docker({socketPath: '/var/run/docker.sock'});

const server = exec(`docker logs -f ${TEST_CONTAINER}`);

server.stderr.pipe(process.stderr);
server.stdout.pipe(process.stdout);

(async function waitForE2ETest() {
    const e2eContainer = docker.getContainer(TEST_CONTAINER);
    const inspectE2EContainer = promisify(e2eContainer.inspect).bind(e2eContainer);
    const e2eStatus = await inspectE2EContainer();
    if (e2eStatus.State.Status !== 'exited') {
        await delay(DELAY_TIME);
        return waitForE2ETest();
    }
    console.log(`Test has finished with status: ${e2eStatus.State.ExitCode}`);
    process.exit(e2eStatus.State.ExitCode);
})();