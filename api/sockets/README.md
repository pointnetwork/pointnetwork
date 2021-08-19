## WebSocket Endpoints

The Point Network node has two WebSocket endpoints defined:

* `NodeSocketController` which is used for internal socket connections and is exposed on the Nodes internal API port.
* `ZProxySocketController` which is used for for handling ZApp websocket connections via the ZProxy API port.

### Connecting to the NodeSocketController

This is exposed on the Nodes internal API port. The routes are defined in [ws_routes.js](../ws_routes.js) and the endpoint is served using Fastify WebSockets. Its possible to try out this socket using the `WebSocket Test client` (see below for details).

#### Using the WebSocket Test client

You can start the `WebSocket Test client` using the following at the terminal:

```
node scripts/ws/clientTest.js
```

Check out the terminal for details.

### Connecting to the ZProxySocketController

This is exposed on the ZProxy API port. The connection is made via the ZApp domain root. For example, if the ZApp domain is `example.z` then the WebSocket connection can be made at `wss://example.z`. See the [hello.z](./example/hello.z) demo app for examples.

### WebSocket Request Messages

To issue a command via a WebSocket, send a payload request in this form:

```
{type: '', params: ''}
```

Where `type` is the command type and `params` are the command parameters.

For example, to subscribe to a Smart Contract event via the `ZProxySocketController` send the following payload:

```
{type: 'subscribeContractEvent', params: {contract: '', event: ''}}
```

Where `subscribeContractEvent` is the command type for subscribing to Smart Contract events and the `params` contains an object with the keys `contract` that specifies the contract name and `event` that specifies the name of the event to subscribe to.

For example, to subscribe to the `ProductSoldEvent` in the `Store` Smart Contract of the `store.z` app, you would issue the following command to the already connected websocket (via `wss://store.z`):

```
{ type: 'subscribeContractEvent',
  params: {
    contract: 'Store',
    event: 'ProductSoldEvent'}
  }
```

### WebSocket Response Messages

Messages sent from the Node socket to the client will always echo the original command object (containing the `type` and `params` keys) that was used to initiate the call or the subscripton. The payload will also contain three other keys: `data` (containing the acutal response data from the call or subscription), `event` (denotes if this is data from the call or a message from the socket related to the command) and `hostname` (the hostname / domain of the app that requested this message).

Essentially there will be three event types of response message to handle:

* `SUBSCRIBED_EVENT` - sent when a subscription command has successfully SUBSCRIBED
* `UNSUBSCRIBED_EVENT` - sent when a subscription command has successfully UNSUBSCRIBED
* `DATA_EVENT` - sent when there is an event emitted on the subscribed subscription or a call is returning data

### SUBSCRIBED_EVENT payload

A `SUBSCRIBED_EVENT` occurs when subscription command has successfully subscribed, for example to a specific event on a smart contract. When this happens a message is returned to the client of event type `SUBSCRIBED_EVENT` so that the client application knows the subscription is sucessful.

For example, the response from subsribing to the `ProductSoldEvent` on the `Store` smart contract would be:

```
{
  "hostname": "store.z",
  "type": "subscribeContractEvent",
  "params": {
    "contract": "Store",
    "event": "ProductSoldEvent"
  },
  "data": {
    "subscriptionId": "0xa",
    "message": "Subscribed to Store contract ProductSoldEvent events"
  },
  "event": "SUBSCRIBED_EVENT"
}
```

Note that the original command payload is echod back (`type` and `params`), the `hostname` is set to that of the caller app domain (store.z) and that the `data` key contains an object with the actual `subscriptionId` associated with the subscription (keep that for unsubscribing later!) and a `message` key. The `event` is set to `SUBSCRIBED_EVENT`.

The client app can filter for its own hostname and for this type of event to react accordingly when the subscription is successfully established.

### UNSUBSCRIBED_EVENT payload

A `UNSUBSCRIBED_EVENT` occurs when a subscription command has successfully unsubscribed to a specific subscription by id.  When this happens a message is returned to the client of event type `UNSUBSCRIBED_EVENT` so that the client application knows the subscription has been sucessfully removed.

For example, the response from unsubsribing to the `ProductSoldEvent` on the `Store` Smart Contract via the `subscriptionId` = `0xa` would be:

```
{
  "hostname": "store.z",
  "type": "removeSubscriptionById",
  "params": {
    "contract": "Store",
    "event": "ProductSoldEvent",
    "subscriptionId": "0xa"
  },
  "data": {
    "message": "Unsubscribed from Store contract ProductSoldEvent events using subscription id 0xa"
  },
  "event": "UNSUBSCRIBED_EVENT"
}
```

Note that the original command payload is echod back (`type` and `params`), the `hostname` is set to that of the caller app domain (store.z) and that the `data` key contains an object with a single `message` key. The `event` is set to `UNSUBSCRIBED_EVENT`.

The client app can filter for its own hostname and for this type of event to react accordingly when the subscription is successfully removed.

### DATA_EVENT payload

A `DATA_EVENT` is sent when there is an event emitted on the subscribed subscription or a call is returning data. So this is the most common event type since its emitted when an event is emiited on the subsription.

For example, in the `Hello.z` example app, the client subscribes to the `UpdatedValue` event in the `Hello` Smart Contract. Since that event is defined in the Smart Contract as `event UpdatedValue(string oldValue, string newValue);` then the `data.returnValues` key of the message will contain an object with the keys `oldValue` and `newValue`. See an example payload message from the socket below:

```
{
  "hostname": 'hello.z',
  "type": "subscribeContractEvent",
  "params": {
    "contract": "Hello",
    "event": "UpdatedValue"
  },
  "data": {
    "logIndex": 0,
    "transactionIndex": 0,
    "transactionHash": "0xf525ddb1069d66855137878c66fc66092005b1731557119880c0e552880fc3d8",
    "blockHash": "0x53d60db399b1d85e529d64f901729b5840230abdb9c01233db5bbc97bf4a6e75",
    "blockNumber": 38,
    "address": "0xC986038239801F079336e6F69438aABC0eE46487",
    "type": "mined",
    "removed": false,
    "id": "log_14c3a8ce",
    "returnValues": {
      "0": "Hello from the Blockchain!",
      "1": "I will update the value now",
      "oldValue": "Hello from the Blockchain!",
      "newValue": "I will update the value now"
    },
    "event": "UpdatedValue",
    "signature": "0x4ccb6d79c8056228aebdc79cd2e1894d9b4c61edabcac2abe454385b06302384",
    "raw": {
      "data": "0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000008434f5649442d31390000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008434f5649442d3139000000000000000000000000000000000000000000000000",
      "topics": [
        "0x4ccb6d79c8056228aebdc79cd2e1894d9b4c61edabcac2abe454385b06302384"
      ]
    }
  },
  "event": "DATA_EVENT"
}
```

Note that the original command payload is echod back (`type` and `params`), the `hostname` is set to that of the caller app domain (hello.z) and that the `data` key contains an object with the full smart contract event payload so that the client can use any of this available data. Mostly, in this case, the client will be interestedin the `returnValues` key which contains the keys of the event as defined in the smart contract (in this case `oldValue` and `newValue`). Finally, the `event` key is set to `DATA_EVENT` to denote that this message contains actual data from the subscriotion or call that was made via the WebSocket.

The client app can filter for this type of event to react accordingly when the subscription or call returns data that the client is interested in. See the `hello.z` demo application for examples of this.