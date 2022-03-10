# Point Network

![Point Network](./pointlogowhite.png)

Point Network is an implementation of decentralized internet, also known as web 3.0. Learn how it is designed to take control of your data away from nation states and corporations and give it back to you.

This repository contains the source code of the core of Point Network. It contains the core node implementation as well as docker configuration for running demos of the network on your local computer to test this out.

For more details about the project, including a [Light Paper](https://pointnetwork.io/files/PointNetworkBrochure-c003.pdf) and a [White Paper](https://docs.google.com/document/d/16bcqsnezTKnPyYI7g32gEkrmJE35z8U4Zj0lUUXXQDY/edit) head over to [our official website](https://pointnetwork.io/). Additionally, if you are a developer then please also head over to the [Point Network Wiki](https://pointnetwork.github.io).

If you have found this repo because you want to run your own node then **DO NOT RUN THE NODE DIRECTLY FROM THIS REPO** but instead please follow the steps outlined below under the section [Run a Point Network Node (Testnet)](#run-a-point-network-node-testnet).

## Run a Point Network Node from Dashboard (recommended)

If you want to run a Point Network node (testnet only for now), then please head over to the [Pointnetwork Dashboard repo](https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md) for details on how to download and run the Point Network Dashboard which makes it super easy to run a Point Network node on Mac, Linux or Windows with just a single click!

## Run a Point node manually from the executable

Please mind that this way is more complicated and requires more actions.

Download and unpack the latest [release](https://github.com/pointnetwork/pointnetwork/releases) for your OS.

Create 2 folders somewhere: `datadir` for various data (such as cache, files, etc), and `keystore` (please mind that the latter will contain sensitive information, so keep it safe).

Generate a mnemonic key with 12 words. Again, the easiest way to do this is to run [Pointnetwork Dashboard](https://github.com/pointnetwork/pointnetwork-dashboard/blob/main/ALPHA.md). Or you can use an external tool like [this one](https://iancoleman.io/bip39/)

Create a `key.json` file inside the keystore directory you created, and insert text there: `{"phrase": "<YOUR_MNEMONIC_KEY>"}`

Run the executable you downloaded using the command: 

`DATADIR=<YOUR_DATA_DIR> POINT_KEYSTORE=<YOUR_KEYSTORE_DIR> ./<PATH_TO_EXECUTABLE>`

Make sure you get no errors.

Run the browser (Firefox is recommended) and set up proxy and certificates according to [this](https://pointnetwork.github.io/docs/build-build-with-point-network#open-the-deployed-site-in-point-browser) instruction.

## Run a Point Node from the source code (for developers)

Create `datadir` and `keystore` folders as described in the section above.

Generate a mnemonic key and put it in `key.json` file as described in section above.

Create a file called `local-development.yaml` in the `config` directory and set `datadir` and `wallet.keystore_path` properties pointing to the folders you created. Use `config/default.yaml` as a reference. (This step can be omitted, if you create folders in the locations, set in `default.yaml`).

Install dependencies and start the app using `start:dev` script.

Run the browser and set proxy and certificates as described in the section above.

## Running app in e2e and zappdev docker testing [environments](https://pointnetwork.github.io/docs/build-environments#differences-between-environments)

Preparing folders and mnemonic key as described in sections above is not needed. Just run the command:

`docker compose -f docker-compose.e2e.yaml up -d` for e2e, or

`docker compose -f docker-compose.zappdev.yaml up -d` for zappdev environment.

Run the browser and set proxy and certificates as described in the section above.

Also, you can add our bash [aliases](https://pointnetwork.github.io/docs/build-build-with-point-network#open-the-deployed-site-in-point-browser), which can be useful for develpopment.

## Troubleshooting

For details on troubleshooting, please refer to the [troubleshooting](https://pointnetwork.github.io/docs/troubleshooting#troubleshooting) page in our wiki.

## Debugging

For details on debugging, please refer to the [run a point network node in a vs code debugger](https://pointnetwork.github.io/docs/debugging#run-a-point-network-node-in-a-vs-code-debugger) page in our wiki.

## Database

For more details on the database setup please refer to the [Database README](src/db/README.md).

## Contact

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)
