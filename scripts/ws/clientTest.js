/* Instructions:

Start up all Point Network nodes
Run this file at the terminal `node tests/sockets/client_test.js`
You should see output like so:

{"data":{"ping":"pong"}}

Now run a deployment. You should see the stream update as the files are deployed!
*/
const WebSocket = require('ws');
const readline = require('readline');

const node1Config = require('../../resources/defaultConfig.json')
const node2Config = require('../../resources/demo/config.test2.json')
const node3Config = require('../../resources/demo/config.test3.json')

const ws = new WebSocket(`ws://localhost:${node2Config.api.port}/ws/deploy/progress`);

const path = require('path')

let _console;
const PROMPT = 'ws> ';

deploy_example='example/hello.z'

ws.on('open', () => {
  ws.send('status');
  ws.send('ping');
  _console.prompt();
  // uncomment the below 'deploy' command and the node will deploy the example site!
  // ws.send(`deploy?deploy_path=${path.resolve(deploy_example)}`);
});

ws.on('message', (data) => {
  console.log(JSON.parse(data))
  // console.log("%O", data)
  _console.prompt();
});

function createWsConsole() {
  console.log('***********************************************')
  console.log('Welcome to the Point Network WebSocket Console!')
  console.log()
  console.log('Call any API route via this interface:')
  console.log(`${PROMPT} ping`)
  console.log('{"data":{"ping":"pong"}')
  console.log('***********************************************')
  console.log()
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