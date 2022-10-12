#!/bin/bash

PLATFORM=''
case "$OSTYPE" in
  darwin*)  PLATFORM="darwin" ;;
  linux*)   PLATFORM="linux" ;;
  msys*)    PLATFORM="win32" ;;
  cygwin*)  PLATFORM="win32" ;;
  *)        echo "unknown: $OSTYPE" ;;
esac

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
      echo npm install --target_platform=$PLATFORM -g $package
      npm install --target_platform=$PLATFORM -g $package
  fi
done

#install identity contract
echo "installing identity contract project"
source .bash_alias
cd ../point-contracts
rm -rf cache
rm -rf typechain
rm -rf build
echo "npm install --target_platform=$PLATFORM"
npm install --target_platform=$PLATFORM
echo "npx hardhat compile"
cd ../pointnetwork
npm install --target_platform=$PLATFORM
npx hardhat compile


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
# echo "cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/devlocal/contracts/Identity.json"
# cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/devlocal/contracts/Identity.json

echo "mkdir -p ~/workspace/pn/visitlocal/keystore"
mkdir -p ~/workspace/pn/visitlocal/keystore

echo "cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json"
cp resources/blockchain-test-key2.json ~/workspace/pn/visitlocal/keystore/key.json
echo "cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json"
cp resources/arweave-test-key2.json ~/workspace/pn/visitlocal/keystore/arweave.json
echo 'Creating token in ~/workspace/pn/visitlocal/keystore/token.txt'
echo 'xGrqHMNXLhjEubp1soD0hHN6nXIBsUwA' > ~/workspace/pn/visitlocal/keystore/token.txt
# echo "cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/visitlocal/contracts/Identity.json"
# cp hardhat/build/contracts/Identity.sol/Identity.json ~/workspace/pn/visitlocal/contracts/Identity.json

#installing local node
echo "installing local node"
# echo "npm install --target_platform=$PLATFORM"
# npm install --target_platform=$PLATFORM
echo "npm run build"
npm run build

echo "coping and replacing ~ for full home path on devlocal.yaml and visitlocal.yaml files"
echo "cp resources/config/devlocal_template.yaml config/devlocal.yaml"
cp resources/config/devlocal_template.yaml config/devlocal.yaml
echo "cp resources/config/visitlocal_template.yaml config/visitlocal.yaml"
cp resources/config/visitlocal_template.yaml config/visitlocal.yaml

echo "Rreplacing ~ for full home path on devlocal.yaml and visitlocal.yaml files"

if [ "$OSTYPE" == "cygwin" ] || [ "$OSTYPE" == "msys" ]; then
  WIN_HOME=$(echo $HOME | perl -pe 's!/!\\\\!'g | perl -pe 's!\\\\(\S)!$1:!')
  echo $WIN_HOME
  perl -i -pe"s|~|$WIN_HOME|" config/devlocal.yaml
  perl -i -pe"s|~|$WIN_HOME|" config/visitlocal.yaml        
else
  perl -i -pe"s|~|$HOME|" config/devlocal.yaml
  perl -i -pe"s|~|$HOME|" config/visitlocal.yaml
fi

echo "Installation of local env ended"