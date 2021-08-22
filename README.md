# Point Network

### Run demo in docker compose

The demo setup consists of three Point Network nodes running in a separate containers, a dev blockchain node running a test network (currently the `ganache-cli` is used), and a Point Network contract deployment script running in a dedicated container. Each Point Network node assigned to its own role in the demo. The node roles are:

* Storage Provider
  * Service Name: `storage_provider`
  * Container Name: `pointnetwork_storage_provider`
  * ZProxy port `65500`
  * API port: `24680`
* Website Owner
  * Service Name: `website_owner`
  * Container Name: `pointnetwork_website_owner`
  * ZProxy port `65501`
  * API port: `24681`
* Website Visitor
  * Service Name: `website_visitor`
  * Container Name: `pointnetwork_website_visitor`
  * ZProxy port `65502`
  * API port: `24682`

To run the demo, one should firstly [install `docker`](https://docs.docker.com/get-docker/) and [`docker-compose`](https://docs.docker.com/compose/install/) on their host system. To start the demo, run:

```bash
docker-compose up -d
```

Once the compose is up, the Point Network contracts deployment will start. Unless the contracts get deployed, the Point Network nodes waits for the contract addresses to appear. As soon as the addresses obtained the nodes get started. At this point you may deploy the demo websites via the following command:

```bash
./scripts/deploy-sites-docker.sh
```

Right after the sites are uploaded, one may start the **Point Browser** using [web-ext](https://github.com/pointnetwork/pointsdk#using-web-ext) and configure it to use one of the above listed `ZProxy` ports. The sites will be available at their regular addresses.

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
**Docker Compose Logs**

To follow the logs of *all* the containers simply run `docker-compose logs -f` in the terminal. If you want to follow the logs of a specific container, hten specify the service name as well like so: `docker-compose logs -f storage_provider` (to follow the logs of `storage_provider`)

**Docker Compose Single Site Deployment**

If you want to deploy a single example site then you can do the following:

* Enter the website owner container like this: `docker exec -it pointnetwork_website_owner /bin/bash`,
* Now inside the container terminal: `cd /app/example/store.z`.
* Run the deploy command: `./point deploy ./example/store.z --datadir $DATADIR -v --contracts`

**Docker Compose and Truffle Console**

Since the `blockchain_node` service is exposed via `http://localhost:7545` its therefore possible to use truffle console without any modification. So you can run `truffle console` and it will connect to the running Ganache blockchain in the Docker `blockchain_node` service.

### Install Dependencies (Local Machine Setup)

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
    ./scripts/deploy-sites.sh blog --contracts
    ```

1. Now you can stop the second node (Ctrl+C).
1. Start the **Point Browser** using [web-ext](https://github.com/pointnetwork/pointsdk#using-web-ext)
1. Navigate to `http://blog.z` and it will open the home page of the Example Blog.

## WebSockets

Please refer to the [WebSockets README](./api/sockets/)

## Troubleshooting

To completely reset the nodes, clear all the cache data and redeploy your config files simply run the following script from the project root folder:

```
./scripts/clear-node.sh
```

If the nodes do not appear to cache all the data then ensure that `client.storage.default_redundancy` setting is set to the number of nodes you have running (3).

If the expected node is not responding with the data requests then ensure that `service_provider.enabled` is set to `false` for that node. Typically for the demo we want to have `Node 1` set to true and the others set to false.

### Troubleshooting examining the files / chunks cache in the node disk

Let’s assume that you have deployed the hello.z website from Node 2 (the site owner node) to Node 1. Then when you open a browser and load the site from either Node 1 or Node 2 you will see the page load in the browser window and you will see the same log output in the Node console window. In particular you will see this in the Node console:

```
rootDirId for host hello.z found: b9e32bc06a0b33ba9d3b75bdac7fd1c5ec13381d5fe815f97f3d2028b3593c31
```

What you can do is take the `rootDirId` and use that to output the file contents on either Node 1 or Node 2 using the `cat` command like so (note `test1` in the path is the folder of Node 1):

```
cat ~/.point/test1/data/client_storage_cache/chunk_b9e32bc06a0b33ba9d3b75bdac7fd1c5ec13381d5fe815f97f3d2028b3593c31 | json_pp
```

You should see this output on all nodes:

```json
{
   "type" : "file",
   "merkle" : [
      "8f3a18043933176bd71c8987a227eee8cf6afdcc8110f1adf875827d815c1576",
      "33b489e12fa57c29348b11199076491eaab321bee1f7d88638dae2ee97839752"
   ],
   "filesize" : 146,
   "chunks" : [
      "8f3a18043933176bd71c8987a227eee8cf6afdcc8110f1adf875827d815c1576"
   ],
   "hash" : "keccak256"
}
```

Now take the first chunk id (`8f3a18043933176bd71c8987a227eee8cf6afdcc8110f1adf875827d815c1576`) and run the `cat` command again for both nodes:

```
cat ~/.point/test1/data/client_storage_cache/chunk_8f3a18043933176bd71c8987a227eee8cf6afdcc8110f1adf875827d815c1576 | json_pp
```

You should see this output on all nodes. Notice this is of type `dir` and contains the file list within.

```json
{
   "type" : "dir",
   "files" : [
      {
         "name" : "index.html",
         "id" : "45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2",
         "type" : "fileptr",
         "size" : 192
      }
   ]
}
```

Now take the id of the `fileptr` from the last output and use `cat` command to load the file from the storage layer. This should yield the hello.z index.zhtml template.

```
cat ~/.point/test1/data/client_storage_cache/file_45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2
```

Retuns:

```
<html>
  <head>
    <title>Hello World from Point Network!</title>
  </head>
  <body>
    <div>
      <p>Hello World Example for testing Storage Layer features NODE111</p>
    </div>
  </body>
</html>
```

### Troubleshooting view File / Chunk meta data from nodes Level DB via the Node API

Its possible to view all File / Chunk metadata on a nodes Level DB store by using the Node Storege API.

The Node has endpoints for both Files and Chunks as follows:

* `/api/storage/files` - Returns all Files metadata from nodes Level DB
* `/api/storage/file/:id` - Returns a single File by :id metadata from nodes Level DB
* `/api/storage/chunks` - Returns all Chunks metadata from nodes Level DB
* `/api/storage/chunk/:id`  - Returns a single Chunk by :id metadata from nodes Level DB

You can any client to access these APIs. The easiest way to get data from these APIs is to use `curl` command line tool like so (**NOTE** examples below pipe to the `json_pp` command to pretty print the response JSON )

```
curl http://localhost:2468/api/storage/files | json_pp
curl http://localhost:2468/api/storage/files/45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2 | json_pp
curl http://localhost:2468/api/storage/chunks | json_pp
curl http://localhost:2468/api/storage/chunks/0f1a97888f3c63318bceedd0461c8efe2778a3e1a49934045ee8314d94e335be | json_pp
```

If you take the `fileptr` id of the hello.z index.zhtml site (as shown in the above example this id is `45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2`) and plug that into the /api/files/:id API endpoint, you will see the file meta data for this file id loaded from the Nodes level DB.

So for example (using `curl` piped to `json_pp`):

```
curl http://localhost:2468/api/storage/files/45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2 | json_pp
```

Should return the following result:

```json
{
   "file": {
       "originalPath": "/Users/developer/.point/test1/data/client_storage_cache/file_45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2",
       "dl_status": "ds99",
       "id": "45c1cc29130796f083425310aad7c10ed9c2a4cf7031e69dd40cd8551af65af2",
       "chunkIds": [
           "e939b8d3da28653ef9ce0713641173f999d1f3489905e6a07f694e603e781f99"
       ],
       "size": 192
   }
}
```

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

To run this file, first stop the node you want to connect to (since LevelDB has a limitation of allowing only one connection at a time) and then run the script using `node scripts/db/playground.js`.

To change which Node LevelDB the script connects to, simply modify the `const nodeid` in the `scripts/db/init.js` and then run the `playground.js` script again.

The intention here is to be able to test out different LevelDB models that are available in the node using this 'playground'. So its possible to load any of the `db/models` and interact with the LevelDB.

For example, to use the `File` model:

```
require('./init')
const File = require('../../db/models/file');
... use the File model ...
```

### Database

For more details on the databases please refer to the [Database README](./db/README.md).

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

### Note on Store.z example site

This is a React JS app. So you will need to install dependencies for it and run a build watcher if you want to develop it further.

1. CD into the [./example/store.z/src/](./example/store.z/src/) directory.
1. Run `npm i` to install the sites dependencies
1. Run `npm run watch` (or `npm run watch:docker` if you are running the Node using Docker) to have *parcel* watch the site and build it on any detected changes
1. Run `./scripts/deploy-sites.sh store --contracts` (from the node root folder) to deploy the sites `views` directory that was built using parcel.
1. From the [Point SDK repo README](https://github.com/pointnetwork/pointsdk#using-web-ext), follow the instructions to start an instance of Firefox with the Point SDK extention already installed using `web-ext` command.

### Coding style

Following coding style applies:

* Always use semicolons otherwise [dragons may bite you](https://www.freecodecamp.org/news/codebyte-why-are-explicit-semicolons-important-in-javascript-49550bea0b82/)!
* Use 4 spaces as a default indent for all files and set this in your IDE.

### Developing the Point Network Web App Utility

For details on [Developing the Point Network Web App Utility](../api/web/README.md) please refer to this separate [README]((../api/web/README.md)).

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)


