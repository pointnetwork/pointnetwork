FROM ethereum/solc:0.6.4 AS solc

FROM raidennetwork/raiden:develop

COPY --from=solc /usr/bin/solc /usr/bin/solc
