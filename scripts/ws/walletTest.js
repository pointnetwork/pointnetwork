/* Instructions:

Start up all Point Network nodes
Run this file at the terminal `node scripts/ws/walletTest.js`
You should see output like so:

{"data":{"ping":"pong"}}
*/
const WebSocket = require('ws');

const node1Config = require('../../resources/defaultConfig.json')
// const node2Config = require('../../resources/demo/config.test2.json')
// const node3Config = require('../../resources/demo/config.test3.json')

const ws = new WebSocket(`ws://localhost:${node1Config.api.port}/ws/wallet/connect`);

ws.on('open', () => {
  ws.send('ping');
});

ws.on('message', (data) => {
  console.log(JSON.parse(data))
});