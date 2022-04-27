#!/bin/bash

isNpmPackageInstalled() {
  npm list --depth 1 -g $1 > /dev/null 2>&1
}

echo "installing global packages"
#ganache and arlocal installation
for package in ganache-cli arlocal@1.1.21
do
  if isNpmPackageInstalled $package
  then
      echo $package is already installed, skipping installation.
  else
      echo $package is NOT installed, installing...
      echo npm i -g $package
      npm i -g $package
  fi
done

#install identity contract
echo "installing identity contract project"
source .bash_alias
cd ../point-contracts
rm -rf cache
rm -rf typechain
rm -rf build
echo "npm i"
npm i
echo "npx hardhat compile"
npx hardhat compile
cd ../pointnetwork

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

#installing local node
echo "installing local node"
echo "npm i"
npm i
echo "npm run build"
npm run build

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "Linux detected, replacing ~ for full home path on devlocal.yaml and visitlocal.yaml files"
    sed -i 's|~|'$HOME'|g' config/devlocal.yaml
    sed -i 's|~|'$HOME'|g' config/visitlocal.yaml
fi

echo "Installation of local env ended"





