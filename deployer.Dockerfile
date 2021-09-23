FROM ethereum/solc:0.8.6 AS solc

FROM node:14.17.5-alpine

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /truffle

RUN npm i -g truffle && \
truffle init && \
npm i @openzeppelin/contracts@4.3.0 \
@truffle/hdwallet-provider \
web3@1.5.2

ENTRYPOINT [ "truffle" ]
