FROM ethereum/solc:0.7.6 AS solc

FROM node:10.23.2-alpine3.10

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /truffle

RUN npm i -g truffle @openzeppelin/contracts@3.4.0

ENTRYPOINT [ "truffle" ]
