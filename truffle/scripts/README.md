### Zapp Data Migration Scripts

This document outlines step by step guide to migrate data from one Zapp Smart Contract to another instance of the Zapp Smart Contract. This might be necessary following an update and redeployment of the Zapp where the Smart Contract is also updated. In this case, you will need to also update the data using the process described below.

This process can run in any network. For example, to test this in `zappdev` environment you will want to first spin up a local `zappdev` node, register at least one identity and deploy at least one Zapp and add some content to the Zapp. For a better test, register a second Identity and add content to the Zapp using both Identities.

The example below shows how this process works with migrating data for `twitter.z`

1. Copy the Zapp Smart Contract for the Zapp that you want to migrate data for `cp example/twitter.z/contracts/Twitter.sol truffle/contracts/.`.
1. Change directory into the truffle project folder `cd truffle`
1. Compile `twitter.sol` contract: `truffle compile`
1. Download the list of registerd Identities from the network using `truffle exec scripts/identityImporter.js --download IDENTITY_CONTRACT_ADDRESS`
1. Download the Tweets from the current deployed `twitter.z` Zapp (make sure to add some Tweets first!). NOTE you need to pass the IDENTITY contract address and the IDENTITY data json filename: `truffle exec scripts/twitterImporter.js --download IDENTITY_CONTRACT_ADDRESS IDENTITY_DATA_JSON`
1. Deploy a new instance of the `twitter.z` Zapp and make a note of the new deployed contract address. At this point when you load https://twitter.z in a Point Browser there will not be any tweets.
1. Upload the twitter data to the new deployed twitter Smart Contract:`truffle exec scripts/twitterImporter.js --upload NEW_TWITTER_CONTRACT_ADDRESS TWITTER_DATA_JSON`
1. Reload https://twitter.z and you should see the migrated tweets data.

## Example

Below is an example of the above steps taken while running `zappdev`. Note you will need to change the contract addresses and data file names based on your local values when you run this.

```
cp example/twitter.z/contracts/Twitter.sol truffle/contracts/.

cd truffle

truffle compile

truffle exec scripts/identityImporter.js --download 0x601FfD263027C4B633A5D89D0dE5e98C6420b850

truffle exec scripts/twitterImporter.js --download 0x601FfD263027C4B633A5D89D0dE5e98C6420b850 1645579673-identity.json

truffle exec scripts/twitterImporter.js --upload 0x51F88aDDe44d2dB9d897d06aD5c77Dc3Aa740fce 1645579725-twitter.json
```

## YNet

The above process should also work exactly the same way when running `YNet`. The only difference is that you need to start your local Point Node in `YNet` mode and the rest of the steps should be the same.

There are two differences you must follow:

1. Ensure that you have your key.json stored in $HOME/.point/keystore/key.json
2. Ensure that you pass the `--network ynet` flag when running the truffle scripts.

## YNet Example

Example below shows downloading and uploading tweets from the network. Assumes that the download script is run first before a new contract is deployed.

```
truffle exec scripts/twitterImporter.js --download 0x61Db2E6aD1B19E94638d4C73fDe2ba3dE2498B9b 1643307237-identity.json --network ynet

truffle exec scripts/twitterImporter.js --upload 0x314dF55775e0b6F2B0c6d07C7Ec83a3e1cdC165e 1645590994-twitter.json --network ynet
```