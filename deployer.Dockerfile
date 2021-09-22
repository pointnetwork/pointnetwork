FROM ethereum/solc:0.8.6 AS solc

FROM node:14.17.5-stretch-slim

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /truffle

COPY ./truffle/truffle-config.js /truffle/truffle-config.js
COPY ./scripts/deploy-contracts-docker.js /truffle/run.js

RUN npm i -g truffle @openzeppelin/contracts@4.3.0

ENTRYPOINT [ "truffle" ]
