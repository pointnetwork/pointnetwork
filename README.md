# Point Network

![Point Network](./pointlogowhite.png)

Point Network is an implementation of decentralized internet, also known as web 3.0. Learn how it is designed to take control of your data away from nation states and corporations and give it back to you.

This repository contains the source code of the core of Point Network. It contains the core node implementation as well as docker configuration for running demos of the network on your local computer to test this out.

For more details about the project, including a [Light Paper](https://pointnetwork.io/files/PointNetworkBrochure-c003.pdf) and a [White Paper](https://docs.google.com/document/d/16bcqsnezTKnPyYI7g32gEkrmJE35z8U4Zj0lUUXXQDY/edit) head over to [our official website](https://pointnetwork.io/). Additionally, if you are a developer then please also head over to the [Point Network Wiki](https://pointnetwork.github.io).

If you have found this repo because you want to run your own node then **DO NOT RUN THE NODE DIRECTLY FROM THIS REPO** but instead please follow the steps outlined below under the section [Run a Point Network Node (Testnet)](#run-a-point-network-node-testnet).

## Run a Point Network Node from Dashboard (recommended)

If you want to run a Point Network node (testnet only for now), then please head over to the [Pointnetwork Dashboard repo](https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md) for details on how to download and run the Point Network Dashboard which makes it super easy to run a Point Network node on Mac, Linux or Windows with just a single click!

## Setup Zapp Development Environment without Docker (recommended dev setup)

Please follow [these instructions](https://pointnetwork.github.io/docs/build-zapp-dev-environment-direct-install) on our Wiki.

## Setup Zapp Development Environment using Docker

Please follow [these instructions](https://pointnetwork.github.io/docs/build-zapp-dev-environment-docker#create-a-point-network-profile-in-firefox) on our Wiki.

## Useful Command Aliases

You can also source our set of [bash aliases](.bash_alias) into your local terminal seession which can be useful for development.

## Run a Point node manually from the executable

Please mind that this way is more complicated and requires more actions.

Download and unpack the latest [release](https://github.com/pointnetwork/pointnetwork/releases) for your OS.

Create 2 folders somewhere: `datadir` for various data (such as cache, files, etc), and `keystore` (please mind that the latter will contain sensitive information, so keep it safe).

Generate a mnemonic key with 12 words. Again, the easiest way to do this is to run [Pointnetwork Dashboard](https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md). Or you can use an external tool like [this one](https://iancoleman.io/bip39/)

Create a `key.json` file inside the keystore directory you created, and insert text there: `{"phrase": "<YOUR_MNEMONIC_KEY>"}`

Run the executable you downloaded using the command:

`DATADIR=<YOUR_DATA_DIR> POINT_KEYSTORE=<YOUR_KEYSTORE_DIR> ./<PATH_TO_EXECUTABLE>`

Make sure you get no errors.

Run the browser (Firefox is recommended) and set up proxy and certificates according to [this](https://pointnetwork.github.io/docs/build-zapp-dev-environment-docker#create-a-point-network-profile-in-firefox) instruction.

## Running tests

To run unit tests:

`npm run test`

To run end-to-end tests:

`docker compose -f docker-compose.test.yaml build &&
docker compose -f docker-compose.test.yaml up -d`

Then watch for `test` container logs and exit status

To run end-to-end outside docker container:

`docker compose -f docker-compose.e2e.yaml build &&
`docker compose -f docker-compose.e2e.yaml up -d`

You need to manually deploy the blog contract in the point_node container.
Then you can run the tests this way:

```
npm run build && NODE_ENV=teste2e NODE_TLS_REJECT_UNAUTHORIZED=0 TEST_POINT_NODE=127.0.0.1 npm run test:docker
```

## Troubleshooting

For details on troubleshooting, please refer to the [troubleshooting](https://pointnetwork.github.io/docs/troubleshooting#troubleshooting) page in our wiki.

## Debugging

For details on debugging, please refer to the [run a point network node in a vs code debugger](https://pointnetwork.github.io/docs/debugging#run-a-point-network-node-in-a-vs-code-debugger) page in our wiki.

## Database

For more details on the database setup please refer to the [Database README](src/db/README.md).

## Contact

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)
