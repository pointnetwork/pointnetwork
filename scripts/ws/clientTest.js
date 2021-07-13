/* Instructions:

Start up all Point Network nodes
Run this file at the terminal `node scripts/ws/clientTest.js`
You should see output like so:

{"data":{"ping":"pong"}}

Now run a deployment. You should see the stream update as the files are deployed!
*/
const WebSocket = require('ws');
const readline = require('readline');

// const node1Config = require('../../resources/defaultConfig.json')
const node2Config = require('../../resources/demo/config.test2.json')
// const node3Config = require('../../resources/demo/config.test3.json')

const ws = new WebSocket(`ws://localhost:${node2Config.api.port}/ws/node`);

let _console;
const PROMPT = 'ws> ';

const pingExample={
  type: 'api',
  params: {
    path: 'status/ping'
  }
}

const deployExample={
  type: 'api',
  params: {
    path: 'deploy?deploy_path=./example/hello.z'
  }
}

const contractSubscriptionExample={
  type: 'subscribeContractEvent',
  params: {
    target: 'hello.z',
    contract: 'Hello',
    event: 'HelloWorld'
  }
}

ws.on('open', () => {
  ws.send(JSON.stringify(pingExample))
  _console.prompt();
  // uncomment the below examples to try them out!
  // or just enter the json commands directly into the console as shown below
  // ws.send(JSON.stringify(contractSubscriptionExample))
  // ws.send(JSON.stringify(deployExample))
});

ws.on('message', (data) => {
  console.log(JSON.parse(data))
  console.log("%O", data)
  _console.prompt();
});

function createWsConsole() {
  console.log('***********************************************')
  console.log('Welcome to the Point Network WebSocket Console!')
  console.log()
  console.log('Call any API route via this interface:')
  console.log(`${PROMPT} {"type":"api","params":{"path":"status/ping"}}`)
  console.log('{"data":{"ping":"pong"}')
  console.log()
  console.log('Example: Deploy a site via the API')
  console.log(`${PROMPT} {"type":"api","params":{"path":"deploy?deploy_path=./example/hello.zy"}}`)
  console.log()
  console.log('Example: Wallet transactions are streamed via this socket')
  console.log(`${PROMPT} {"type":"internal","params":{"service":"wallet"}}`)
  console.log()
  console.log('Example: Deployer progress can be streamed via this socket')
  console.log(`${PROMPT} {"type":"internal","params":{"service":"deployer"}}`)
  console.log()
  console.log('Example: Subscribe to Smart Contract Events')
  console.log(`${PROMPT} {"type":"subscribeContractEvent","params":{"target":"hello.z","contract":"Hello","event":"HelloWorld"}}`)
  console.log()
  console.log('***********************************************')
  console.log()
  process.stdin.setEncoding('utf8');
  _console = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: PROMPT
  });
  _console.prompt();
  // define console event handlers
  _console.on('line', async (line) => {
    let cmd = line.trim();
    if (cmd === "exit") _console.close();
    if (cmd === "") {
      _console.prompt();
    } else {
      ws.send(cmd)
    }

  });
  _console.on('close', () => {
    process.exit(1);
  })
}

createWsConsole();