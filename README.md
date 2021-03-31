# Point Network
===============

### Quick run

You can run the following scripts in one terminal window which will clear all your nodes cache, redeploy the config to each node, start Ganache, deploy the smart contracts, start 3 nodes and deploy the example site!

```
./scripts/clear-node.sh
./scripts/run-node.sh
```

Now you can connect to the node to load one of the deployed sites, deploy a new site, or interact with one of the http/ws endpoints. See below for details.

### How to run the full demo

It's very raw prototype code, so you have to do lots of things manually right now.

1. Install using npm:

    ```
    npm i
    ```

1. Start your private Ethereum-compatible web3 provider/blockchain on port `7545` ([Ganache](https://www.trufflesuite.com/ganache) is recommended) and use a `mnemonic` like so:

    ```
    ganache-cli -p 7545 -m 'theme narrow finger canal enact photo census miss economy hotel often'
    ```

1. Put the demo configs in their places in your home directory:

    ```
    ./point demo
    ```

1. cd to the `truffle` directory and deploy smart contracts:
    ```
    cd truffle
    truffle deploy --network development
    ```

1. Note the addresses at which the contracts were deployed and put them into [resources/defaultConfig.json](./resources/defaultConfig.json): `network/identity_contract_address`

1. Create the `data/db` directories for each demo:

    ```
    mkdir -p ~/.point/test1/data/db
    mkdir -p ~/.point/test2/data/db
    mkdir -p ~/.point/test3/data/db
    ```

1. Run the nodes in different tabs

    ```
    ./point --datadir ~/.point/test1 -v
    ./point --datadir ~/.point/test2 -v
    ./point --datadir ~/.point/test3 -v
    ```

1. Tell the second node to deploy the `example.z` website:

    ```
    ./point deploy example/example.z --datadir ~/.point/test2 -v
    ```

1. Now you can stop the second node (Ctrl+C).
1. Run the [Point Browser](https://github.com/pointnetwork/pointbrowser)
1. Navigate to `http://example.z` and it will open the home page of the Example Blog.

### Troubleshooting the demo

To completely reset the nodes, clear all the cache data and redeploy your config files simply run the following script from the project root folder:

```
./scripts/clear-node.sh
```

If the nodes do not appear to cache all the data then ensure that `client.storage.default_redundancy` setting is set to the number of nodes you have running (3).

If the expected node is not responding with the data requests then ensure that `service_provider.enabled` is set to `false` for that node. Typically for the demo we want to have `Node 1` set to true and the others set to false.

### Run a Point Network Node in a VS Code Debugger

The VS Code debugger is configured using the [VS Code launch config](.vscode/launch.json) file. Its configured to launch a test node under your `~/.point/test1` directory.

To start the VS Code debugger, click on the debugger button and at the top select `Launch Point Node` from the drop down and hit the _play_ button.

Now you can add breakpoints and run a depolyment from a separate terminal window to hit the breakpoint.

**NOTE**: The debugger may fail to start and this is usually due to the `point.pid` file still being present in the `~/.point/test1` directory. Simply delete that file (`rm ~/.point/test1/point.pid`) and run the debugger again.

**NOTE**: You might see an error when starting the debugger relating to a fastify plugin: `Error: ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time`. If you see this the debugger session will immediately stop. To fix this issue, you will need to comment out the `fastify-nextjs` plugin registration and `web_routes` lines in the `ApiServer` class and start the debugger again!

**NOTE**: The launch config makes use of the `$HOME` environment variable for the `--datadir` param. If you do not have this environment variable set, then you will need to do so and run the debugger again.

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)

### Attaching to a Point Network Node using Point Network console

To attach to a node use the following (for example use the `--datadir` flag to specify `Test 2`):

```
./point attach --datadir ~/.point/test2
```

In the console REPL you can now issue commands to the node. For example, the command `api ping` will call the `PingController#ping` API endpoint:

```
> api ping
Querying http://localhost:2469/api/ping?
{ ping: 'pong' }
```

To run a deployment via the Console you need to specify the absolute path of the site you want to deploy. For example, to deploy the `example/hello.z` site run the following command in the attached Point Network console (**NOTE**: change `<ABSOLUTEPATHTO>` to your absolute path):

```
> api deploy deploy_path=/<ABSOLUTEPATHTO>/pointnetwork/example/hello.z
Querying http://localhost:2469/api/deploy?deploy_path=/<ABSOLUTEPATHTO>/pointnetwork/example/hello.z
{ status: 'success' }
```

### Using the Point Network LevelDB Playground

Under `scripts/db` there is a js file `playground.js` that can be used to test out interacting with the local LevelDB of one of the nodes.

The playground first loads the `scripts/db/init.js` file which initializes the Point Network Database for the test node specified in that file.

Then in the playground you can load any of the `db/models` and interact with the LevelDB. For example, to use the `File` model:

```
require('./init')
const File = require('../../db/models/file');
... use the File model ...
```

### Using the WebSocket Test client

You can start the `WebSocket Test client` using the following at the terminal:

```
node scripts/ws/clientTest.js
```

### Using nodemon during development

If you are a developer, you might be interested to run the Point Network node using `nodemon` like so:

```
npx nodemon ./point --datadir ~/.point/test2
```

That way, changes in the applications code are detected by nodemon and the Point Network node is then automatically restarted.

### Developing the Point Network Web App Utility

For details on [Developing the Point Network Web App Utility](../api/web/README.md) please refer to this separate [README]((../api/web/README.md)).