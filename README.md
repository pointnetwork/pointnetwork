# Point Network

### Run demo in docker compose

The demo setup consists of three Point Network nodes running in a separate containers, a dev blockchain node running a test network (currently the `ganache-cli` is used), and a Point Network contract deployment script running in a dedicated container. Each Point Network node assigned to its own role in the demo. The node roles are:

* Storage Provider, z-proxy port `65500`
* Website Owner, z-proxy port `65501`
* Website Viewer, z-proxy port `65502`

To run the demo, one should firstly [install `docker`](https://docs.docker.com/get-docker/) and [`docker-compose`](https://docs.docker.com/compose/install/) on their host system. To start the demo, run:

```bash
docker-compose up -d
```

Once the compose is up, the Point Network contracts deployment will start. Unless the contracts get deployed, the Point Network nodes waits for the contract addresses to appear. As soon as the addresses obtained the nodes get started. At this point you may deploy the demo websites via the following command:

```bash
./scripts/deploy-sites-docker.sh
```

Right after the sites are uploaded, one may start the [Point Browser](https://github.com/pointnetwork/pointbrowser) and configure it to use one of the above listed `z-proxy` ports. The sites will be available at their regular addresses.

### Develop using the docker compose

If one needs to leverage the Point Network docker-compose and still be able to make changes in the code, they can do so by starting the compose the following way:

```bash
docker-compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
```

When started this way the service has all the local folders [bind-mounted](https://docs.docker.com/storage/bind-mounts/) into each Point Network node container. Therefore all the local changes will be available inside the dockerized nodes.

If you make changes to the code while the compose is already running, you can restart the whole service or a particular container like this:

```bash
docker-compose restart storage_provider # to restart a specified container
docker-compose restart # to restart the whole compose
```

### Install Dependencies

Install all global and project dependencies. Run the following under the project root folder:

```
nvm install
nvm use
npm i -g truffle
npm i -g ganache-cli
npm i
```

### Quick run

You can run the following scripts in one terminal window which will clear all your nodes cache, redeploy the config to each node, start Ganache, deploy the smart contracts, start 3 nodes and deploy the example sites! NOTE: This assumes you have already [installed the global and project dependencies](#install-dependencies) as mentioned above.

```
./scripts/clear-node.sh
./scripts/run-node.sh
./scripts/deploy-sites.sh
```

Now you can connect to the node to load one of the deployed sites, deploy a new site, or interact with one of the http/ws endpoints. See below for details.

### Quick test of deployed sites

To quickly test each of the deployed sites are responding there is a script that will ping the root path of each of the test sites. Simply run:

```
./scripts/ping-sites.sh
```

This is a simple bash script that uses `curl` to fetch the root of each example domain and return the HTTP status code back to terminal. The script works by issuing a GET request to the ZProxy endpoint of Node 3 at http://localhost:65501 and by also setting the `Host` header to the domain being tested.

If the script returns `404` for a domain it means the site is not found so you probably need to deploy it, if you see `500` then there was a server side error on the node so you will need to check the logs and if you see `200` then the example domain was found and root page returned successfully.

All sites should respond with a 200 status code. If not there is something wrong which can be checked in the logs or you may also want to check the troubleshooting section further down in this document.

### How to run the full demo

1. Firstly, make sure you [install all the dependencies](#install-dependencies) as mentioned above.

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

1. Tell the second node to deploy the `blog.z` website:

    ```
    ./point deploy example/blog.z --datadir ~/.point/test2 -v
    ```

1. Now you can stop the second node (Ctrl+C).
1. Run the [Point Browser](https://github.com/pointnetwork/pointbrowser)
1. Navigate to `http://blog.z` and it will open the home page of the Example Blog.

### Troubleshooting the demo

To completely reset the nodes, clear all the cache data and redeploy your config files simply run the following script from the project root folder:

```
./scripts/clear-node.sh
```

If the nodes do not appear to cache all the data then ensure that `client.storage.default_redundancy` setting is set to the number of nodes you have running (3).

If the expected node is not responding with the data requests then ensure that `service_provider.enabled` is set to `false` for that node. Typically for the demo we want to have `Node 1` set to true and the others set to false.

### Troubleshooting installing TOR browser during NPM install

There are dependencies installed that require the TOR browser. These dependencies attempt to download and install TOR. If you have issues during this step then you can set an environment variable and run the installation again which will skip downloading TOR like so:

```
export GRANAX_USE_SYSTEM_TOR=1
npm i
```

Now when you run the installation, the script will not attempt to download TOR but will instead output:

```
...
> @pointnetwork/granax@3.2.5 postinstall ~/pointnetwork/node_modules/@pointnetwork/granax
> node script/download-tbb.js

Skipping automatic Tor installation...
Be sure to install Tor using your package manager!
...
```

### Run a Point Network Node in a VS Code Debugger

The VS Code debugger is configured using the [VS Code launch config](.vscode/launch.json) file. Its configured to launch a test node under your `~/.point/test1` directory.

To start the VS Code debugger, click on the debugger button and at the top select `Launch Point Node` from the drop down and hit the _play_ button.

Now you can add breakpoints and run a depolyment from a separate terminal window to hit the breakpoint.

**NOTE**: The debugger may fail to start and this is usually due to the `point.pid` file still being present in the `~/.point/test1` directory. Simply delete that file (`rm ~/.point/test1/point.pid`) and run the debugger again.

**NOTE**: You might see an error when starting the debugger relating to a fastify plugin: `Error: ERR_AVVIO_PLUGIN_TIMEOUT: plugin did not start in time`. If you see this the debugger session will immediately stop. To fix this issue, you will need to comment out the `fastify-nextjs` plugin registration and `web_routes` lines in the `ApiServer` class and start the debugger again!

**NOTE**: The launch config makes use of the `$HOME` environment variable for the `--datadir` param. If you do not have this environment variable set, then you will need to do so and run the debugger again.

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

### Testing all example sites deployment

There is a convenience script that will deploy all the example sites (found in the [./example](./example) folder). This is useful as a check to make sure the nodes can still run a sucessful deployment of all the example sites. The script to run is:

```
./scripts/deploy-sites.sh
```

### Using nodemon during development

If you are a developer, you might be interested to run the Point Network node using `nodemon` like so:

```
npx nodemon ./point --datadir ~/.point/test2
```

That way, changes in the applications code are detected by nodemon and the Point Network node is then automatically restarted.

### Developing the Point Network Web App Utility

For details on [Developing the Point Network Web App Utility](../api/web/README.md) please refer to this separate [README]((../api/web/README.md)).

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)