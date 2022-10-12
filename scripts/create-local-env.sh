#!/bin/bash

isNpmPackageInstalled() {
  npm list -g | grep -c $1 > /dev/null 2>&1
}

echo "removing obsolete packages"
if isNpmPackageInstalled ganache-cli
then
    echo ganache-cli is obsolete, removing installation.
    npm remove --global ganache-cli
fi

echo "installing global packages"
#ganache and arlocal installation
for package in ganache arlocal@1.1.49 ts-node
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

#checking it point-contracts folder exists
if [ ! -d "../point-contracts" ]; then
  echo "point-contracts repository does not exist, cloning"
  cd ..
  # ideally we should check that git is installed, but it's a dev script, so we assume...
  git clone https://github.com/pointnetwork/point-contracts.git
  cd pointnetwork
fi

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

#installing local node
echo "installing local node"
echo "npm i"
npm i
echo "npm run build"
npm run build
echo "npm run build:explorer"
npm run build:explorer

echo "Installation of local env ended"
