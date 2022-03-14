import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

const ethers = require('ethers');
const keystore = {"phrase":"observe valid excite index skill drink argue envelope domain second ten hybrid"};

if (typeof keystore !== 'object') {
    throw new Error('Please provide a valid kstore');
}

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const privateKey = process.env.DEPLOYER_ACCOUNT || '0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e';
const host = process.env.BLOCKCHAIN_HOST || '127.0.0.1';
const port = process.env.BLOCKCHAIN_PORT || 7545;
const networkid = process.env.BLOCKCHAIN_NETWORK_ID || '*';

const devaddress = 'http://' + host + ':' + port

const wallet = ethers.Wallet.fromMnemonic(keystore.phrase);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.8.0",
            },
            {
                version: "0.8.4",
            },
            {
                version: "0.8.7",
            }
        ],
    },
  networks: {
    development: {
      url: devaddress,
      accounts:
        [privateKey],
    },
  }
};

export default config;
