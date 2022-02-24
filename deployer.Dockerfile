FROM ethereum/solc:0.8.6 AS solc

FROM node:14.17.5-alpine

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /hardhat

RUN apk update && apk add --no-cache git

#RUN npm i -g truffle && \
#truffle init && \
#npm i @openzeppelin/contracts@4.3.0 \
#@truffle/hdwallet-provider \
#web3@1.5.2

RUN yarn add --dev "hardhat@^2.8.4" \
 "@nomiclabs/hardhat-waffle@^2.0.0" \ 
 "@openzeppelin/contracts@4.3.0" \
 "ethereum-waffle@^3.0.0" \
 "chai@^4.2.0" \
 "@nomiclabs/hardhat-ethers@^2.0.0" \
 "ethers@^5.0.0" \
 "@nomiclabs/hardhat-etherscan@^3.0.0" \
 "dotenv@^10.0.0" \
 "eslint@^7.29.0" \
 "eslint-config-prettier@^8.3.0" \
 "eslint-config-standard@^16.0.3" \
 "eslint-plugin-import@^2.23.4" \
 "eslint-plugin-node@^11.1.0" \
 "eslint-plugin-prettier@^3.4.0" \
 "eslint-plugin-promise@^5.1.0" \
 "hardhat-gas-reporter@^1.0.4" \
 "prettier@^2.3.2" \
 "prettier-plugin-solidity@^1.0.0-beta.13" \
 "solhint@^3.3.6" \
 "solidity-coverage@^0.7.16" \
 "@typechain/ethers-v5@^7.0.1" \
 "@typechain/hardhat@^2.3.0" \
 "@typescript-eslint/eslint-plugin@^4.29.1" \
 "@typescript-eslint/parser@^4.29.1" \
 "@types/chai@^4.2.21" \
 "@types/node@^12.0.0" \
 "@types/mocha@^9.0.0" \
 "ts-node@^10.1.0" \
 "typechain@^5.1.2" \
 "typescript@^4.5.2"


ENTRYPOINT ["npx"]

