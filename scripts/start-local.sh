#!/bin/bash

#arlocal
echo "Starting arlocal"
arlocal &

#ganache
echo "Starting ganache"
ganache -v -p 7545 -i 256 \
  --account 0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e,0x56bc75e2d63100000 \
  --account 0x22a316b515a68d4851087571bd5ff051f5ec3f13b28997fb80a8de055052514e,0x56bc75e2d63100000 & 

#install identity contract
echo "Installing Identity and Subscription contracts"
source .bash_alias
cd ../point-contracts
rm -rf cache
rm -rf typechain
rm -rf build
npm run build
export MODE=zappdev
npm start
cp resources/Identity-address.json ../pointnetwork/hardhat/resources/
cp resources/Subscription-address.json ../pointnetwork/hardhat/resources/
cp contracts/* ../pointnetwork/hardhat/contracts/ 
cp -r build/contracts/Identity.sol ../pointnetwork/hardhat/build/contracts/Identity.sol
cp -r build/contracts/Subscription.sol ../pointnetwork/hardhat/build/contracts/Subscription.sol
cd ../pointnetwork



