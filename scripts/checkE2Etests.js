#!/usr/bin/env node

const Docker = require('dockerode');
const {promisify} = require('util');
const DELAY_TIME = 10; //seconds

function delay(time) {
    return new Promise((res) => setTimeout(res, time * 1000));
}

const docker = new Docker({socketPath: '/var/run/docker.sock'});

(async function waitForE2ETest() {
    const e2eContainer = docker.getContainer('pointnetwork-test-1');
    const inspectE2EContainer = promisify(e2eContainer.inspect).bind(e2eContainer);
    const e2eStatus = await inspectE2EContainer();
    if (e2eStatus.State.Status !== 'exited') {
        console.log(`Tests are still running, checking again in ${DELAY_TIME} seconds`);
        await delay(DELAY_TIME);
        return waitForE2ETest();
    }
    console.log(`Test has finished with status: ${e2eStatus.State.ExitCode}`);
    process.exit(e2eStatus.State.ExitCode);
})();