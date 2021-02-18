# Point Network
===============

### How to run the demo

It's very raw prototype code, so you have to do lots of things manually right now.

1. Install using yarn:

    ```
    yarn install
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

1. Tell the second one to deploy the `example.z` website:

    ```
    ./point deploy example/example.z --datadir ~/.point/test2 -v
    ```

1. Now you can stop the second node (Ctrl+C).
1. Run the [Point Browser](https://github.com/pointnetwork/pointbrowser)
1. Navigate to `http://example.z` and it will open the home page of the Example Blog.

### Run a Point Node in a VS Code Debugger

The VS Code debugger is configured using the [VS Code launch config](./vscode/launch.json) file. Its configured to launch a test node under your `~/.point/test1` directory.

To start the VS Code debugger, click on the debugger button and at the top select `Launch Point Node` from the drop down and hit the _play_ button.

Now you can add breakpoints and run a depolyment from a separate terminal window to hit the breakpoint.

Note that it may fail to start and this is usually due to the `point.pid` file still being present in the `~/.point/test1` directory. Simply delete that file (`rm ~/.point/test1/point.pid`) and run the debugger again.

Note also that the launch config makes use of the `$HOME` environment variable for the `--datadir` param. If you do not have this environment variable set, then you will need to do so and run the debugger again.

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at [https://pointnetwork.io/](https://pointnetwork.io/)