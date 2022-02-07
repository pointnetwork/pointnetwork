/* Instructions:

Start up all Point Network nodes
Run this file at the terminal `node scripts/ws/clientTest.js`

This will connect to the PN Node internal Web Socket endpoint as defined in ws_routes.js.

On startup it will run the pingExample, walletSubscriptionExample and deployerSubscriptionExample as defined below.

* pingExample: simply calls the status/ping api and returns the response payload in the console
* walletSubscriptionExample: subscribes to all wallet transactions and emits them in the console
* deployerSubscriptionExample: subscribes to all deployment progress and emits them in the console
*/
const WebSocket = require('ws');
const readline = require('readline');

const configPath = '../../resources/demo/config.test2.json'; // change the file to connect to a different node
const config = require(configPath);

const ws = new WebSocket(`ws://localhost:${config.api.port}/`);

let _console;
const PROMPT = 'ws> ';

const pingExample = {
    type: 'api',
    params: {path: 'status/ping'}
};

const walletSubscriptionExample = {
    type: 'walletSubscription',
    params: {}
};

const deployerSubscriptionExample = {
    type: 'deployerSubscription',
    params: {}
};

ws.on('open', () => {
    ws.send(JSON.stringify(pingExample));
    ws.send(JSON.stringify(walletSubscriptionExample));
    ws.send(JSON.stringify(deployerSubscriptionExample));
    _console.prompt();
});

ws.on('message', data => {
    console.log(JSON.parse(data));
    console.log('%O', data);
    _console.prompt();
});

function createWsConsole() {
    console.log('***********************************************');
    console.log('Welcome to the Point Network WebSocket Console!');
    console.log();
    console.log('Call any API route via this interface:');
    console.log('Example: Call the status/ping API endpoint');
    console.log(`${PROMPT} {"type":"api","params":{"path":"status/ping"}}`);
    console.log();
    console.log('Example: Deploy a site via the API');
    console.log(
        `${PROMPT} {"type":"api","params":{"path":"deploy?deploy_path=./example/hello.z"}}`
    );
    console.log();
    console.log('Example: Wallet transactions are streamed via this socket');
    console.log(`${PROMPT} {"type":"walletSubscription","params":{}}`);
    console.log();
    console.log('Example: Deployer progress can be streamed via this socket');
    console.log(`${PROMPT} {"type":"deployerSubscription","params":{}}`);
    console.log();
    console.log('***********************************************');
    console.log();
    process.stdin.setEncoding('utf8');
    _console = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: PROMPT
    });
    _console.prompt();
    // define console event handlers
    _console.on('line', async line => {
        const cmd = line.trim();
        if (cmd === 'exit') _console.close();
        if (cmd === '') {
            _console.prompt();
        } else {
            ws.send(cmd);
        }
    });
    _console.on('close', () => {
        process.exit(1);
    });
}

createWsConsole();
