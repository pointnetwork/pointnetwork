#!/bin/bash

#stopping all processes
echo "Calling Stop Local script to kill running processes"
sh ./scripts/stop-local.sh

#removing data files
echo "Removing data files"
echo "rm -rf ~/workspace/pn/devlocal/"
rm -rf ~/workspace/pn/devlocal/
echo "rm -rf ~/workspace/pn/visitlocal/"
rm -rf ~/workspace/pn/visitlocal/

#cleaning hardhat cache.
echo "cleaning point-contracts cache and temp files"

if [ -d ../point-contracts ]; then
    cd ../point-contracts
    echo "rm -rf cache"
    rm -rf cache
    echo "rm -rf typechain"
    rm -rf typechain
    echo "rm -rf build"
    rm -rf build
    echo "rm -rf .openzeppelin"
    rm -rf .openzeppelin
    echo "rm resources/Identity-address.json"
    rm -f resources/Identity-address.json
    echo "rm resources/unknown-1337.json"
    rm -f resources/unknown-1337.json
    cd ../pointnetwork
fi

#removing log files
echo "rm *.log"
rm *.log

#creating local directories
echo "creating local directories"
echo "mkdir -p ~/workspace/pn/devlocal/keystore"
mkdir -p ~/workspace/pn/devlocal/keystore

echo "cp resources/blockchain-test-key.json ~/workspace/pn/devlocal/keystore/key.json"
cp resources/blockchain-test-key.json ~/workspace/pn/devlocal/keystore/key.json
echo "cp resources/arweave-test-key.json ~/workspace/pn/devlocal/keystore/arweave.json"
cp resources/arweave-test-key.json ~/workspace/pn/devlocal/keystore/arweave.json
echo 'Creating token in ~/workspace/pn/devlocal/keystore/token.txt'
echo 'xGrqHMNXLhjEubp1soD0hHN6nXIBsUwA' > ~/workspace/pn/devlocal/keystore/token.txt
echo "cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/devlocal/contracts/Identity.json"
cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/devlocal/contracts/Identity.json

echo "mkdir -p ~/workspace/pn/visitlocal/keystore"
mkdir -p ~/workspace/pn/visitlocal/keystore

echo "cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json"
cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json
echo "cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json"
cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json
echo 'Creating token in ~/workspace/pn/visitlocal/keystore/token.txt'
echo 'xGrqHMNXLhjEubp1soD0hHN6nXIBsUwA' > ~/workspace/pn/visitlocal/keystore/token.txt
echo "cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/visitlocal/contracts/Identity.json"
cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/visitlocal/contracts/Identity.json