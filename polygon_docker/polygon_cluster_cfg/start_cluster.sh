#!/bin/bash

mkdir -p ./data/logs

# the data directory is created in order to mount a docker volume here and persist the blockchain state
# in order to achieve that we replace the data folders with the initial configuration just in the case
# they are not already there and we have a brand new volume

[ ! -d "./data/test-chain-1" ] && cp -r ./test-chain-1 ./data/test-chain-1
[ ! -d "./data/test-chain-2" ] && cp -r ./test-chain-2 ./data/test-chain-2
[ ! -d "./data/test-chain-3" ] && cp -r ./test-chain-3 ./data/test-chain-3
[ ! -d "./data/test-chain-4" ] && cp -r ./test-chain-4 ./data/test-chain-4
[ ! -f "./data/genesis.json" ] && cp ./genesis.json ./data/genesis.json

cd ./data

polygon-edge server --data-dir ./test-chain-1 --chain ./genesis.json --grpc :10000 --libp2p :10001 --jsonrpc :7545 --seal &> ./logs/node1.log &
polygon-edge server --data-dir ./test-chain-2 --chain ./genesis.json --grpc :20000 --libp2p :20001 --jsonrpc :20002 --seal &> ./logs/node2.log &
polygon-edge server --data-dir ./test-chain-3 --chain ./genesis.json --grpc :30000 --libp2p :30001 --jsonrpc :30002 --seal &> ./logs/node3.log &
polygon-edge server --data-dir ./test-chain-4 --chain ./genesis.json --grpc :40000 --libp2p :40001 --jsonrpc :40002 --seal &> ./logs/node4.log &

tail -F ./logs/node1.log
