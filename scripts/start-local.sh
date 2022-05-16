#!/bin/bash

#arlocal
echo "Starting arlocal"
npx arlocal@1.1.30 &

#ganache
echo "Starting ganache"
ganache-cli -v -p 7545 -i 256 --keepAliveTimeout 20000 \
  --account 0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e,0x56bc75e2d63100000 \
  --account 0x22a316b515a68d4851087571bd5ff051f5ec3f13b28997fb80a8de055052514e,0x56bc75e2d63100000 & 

#install identity contract
echo "Installing Identity contract"
source .bash_alias
cd ../point-contracts
rm -rf cache
rm -rf typechain
rm -rf build
npx hardhat compile
export MODE=zappdev
npm start
cp resources/Identity-address.json ../pointnetwork/hardhat/resources/ 
cp contracts/Identity.sol ../pointnetwork/hardhat/contracts/ 
cd ../pointnetwork



