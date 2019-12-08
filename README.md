Point Network
=============

How to run the demo
-------------------

It's very raw prototype code, so you have to do lots of things manually right now.

1. Start your private Ethereum-compatible web3 provider/blockchain on port `7545` ([Ganache](https://www.trufflesuite.com/ganache) is recommended).
1. Edit the demo configs in `resources/demo/config.test?.json` to insert the addresses with their private keys that hold some testnet money into `client.wallet` branch.
1. Do the same for the addresses in `truffle/contracts/Identity.sol:constructor()` if you want to have the test identities claimed at the start.
1. Put the demo configs in their places in your home directory:
    ```
    point demo
    ```
1. Cd to the `truffle` directory and deploy smart contracts:
    ```
    truffle deploy --network development
    ```
1. Note the addresses at which the contracts were deployed and put them into `resources/defaultConfig.json`: `network/zdns_contract_address` and `network/keyvalue_contract_address` 
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
1. Navigate to `example.z`

Please let us know if you hit any obstacles of encounter errors or bugs by opening an issue or emailing info@pointnetwork.io.

Visit our website at https://pointnetwork.io/