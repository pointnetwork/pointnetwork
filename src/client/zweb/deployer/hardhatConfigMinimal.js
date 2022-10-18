export const hardhatConfigMinimal = `
require('@openzeppelin/hardhat-upgrades');

const optimizerConfig = {
    optimizer: {
        enabled: true,
        runs: 1000
    }
};

module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.0',
                settings: {...optimizerConfig}
            },
            {
                version: '0.8.4',
                settings: {...optimizerConfig}
            },
            {
                version: '0.8.7',
                settings: {...optimizerConfig}
            }
        ]
    }
}
`;
