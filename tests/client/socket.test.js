/* Instructions:

Start up all Point Network nodes
Run this file at the terminal `node tests/sockets/client_test.js`
You should see output like so:

{"files":[]}
{"type":"socket_status","status":"Running"}
{"type":"message","value":"pong"}

Now run a deployment. You should see the stream update as the files are deployed!
*/
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:2469/ws/deploy/progress');

ws.on('open', () => {
  // ws.send('status');
  ws.send('ping');
});

ws.on('message', (data) => {
  console.log(data);
});
