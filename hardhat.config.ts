import { HardhatUserConfig} from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-change-network";

const privateKey = process.env.DEPLOYER_ACCOUNT || '0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e';
const host = process.env.BLOCKCHAIN_HOST || 'blockchain_node';
const port = process.env.BLOCKCHAIN_PORT || 7545;

const devaddress = 'http://' + host + ':' + port

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

let defaultNetwork: string;
if (process.env.MODE === 'e2e' || process.env.MODE === 'zappdev') {
    defaultNetwork = 'development';
}else{
    defaultNetwork = 'ynet';
}

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
    paths: {
        artifacts:'./hardhat/build',
        sources: './hardhat/contracts',
        tests: './hardhat/tests',
        cache: './hardhat/cache'
    },
    networks: {
        development: {
            url: devaddress,
            accounts:
            [privateKey],
        },
        ynet: {
            url: 'http://ynet.point.space:44444',
            accounts:
                ['ea2a5e73b526b8a5f60c7f19719b6abe71f054721a8a367fff0a9e2cb07e1080'],
        },
    },
    defaultNetwork: defaultNetwork
};

export default config;
