#!/bin/bash

#stopping all processes
echo "Sending SIGKILL to all node processes"
killall node -v -s KILL
echo "Finished"

#removing data files
echo "Removing data files"
echo "rm -rf ~/workspace/pn/devlocal/"
rm -rf ~/workspace/pn/devlocal/
echo "rm -rf ~/workspace/pn/visitlocal/"
rm -rf ~/workspace/pn/visitlocal/

#cleaning hardhat cache.
echo "cleaning hardhat cache and temp files"
cd hardhat
echo "rm -rf cache"
rm -rf cache
echo "rm -rf typechain"
rm -rf typechain
echo "rm -rf build"
rm -rf build
echo "rm -rf .openzeppelin"
rm -rf .openzeppelin
echo "rm resources/Identity-address.json"
rm resources/Identity-address.json
echo "rm resources/unknown-1337.json"
rm resources/unknown-1337.json
cd ..

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

echo "mkdir -p ~/workspace/pn/visitlocal/keystore"
mkdir -p ~/workspace/pn/visitlocal/keystore

echo "cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json"
cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json
echo "cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json"
cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json


echo "Removing, coping and replacing ~ for full home path on devlocal.yaml and visitlocal.yaml files"
echo "cp resources/configs/devlocal_template.yaml config/devlocal.yaml"
cp resources/configs/devlocal_template.yaml config/devlocal.yaml
echo "cp resources/configs/visitlocal_template.yaml config/visitlocal.yaml"
cp resources/configs/visitlocal_template.yaml config/visitlocal.yaml

perl -i -pe"s|~|$HOME|" config/devlocal.yaml
perl -i -pe"s|~|$HOME|" config/visitlocal.yaml

