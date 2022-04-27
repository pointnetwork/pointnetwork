#!/bin/bash

#arlocal
nohup npx arlocal@1.1.21 &> arlocal.log &
echo "Arlocal started, logging to arlocal.log."

#ganache
nohup ganache-cli -v -p 7545 -i 256 --keepAliveTimeout 20000 \
  --account 0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e,0x56bc75e2d63100000 \
  --account 0x22a316b515a68d4851087571bd5ff051f5ec3f13b28997fb80a8de055052514e,0x56bc75e2d63100000 &> ganache.log & 
echo "Ganache started, logging to ganache.log."

#install identity contract
echo "Installing Identity contract."
source .bash_alias
cd ../point-contracts
rm -rf cache
rm -rf typechain
rm -rf build
npx hardhat compile
npm start
cp resources/Identity-address.json ../pointnetwork/hardhat/resources/ 
cp contracts/Identity.sol ../pointnetwork/hardhat/contracts/ 
cd ../pointnetwork

export NODE_CONFIG_ENV=devlocal 
export MODE=zappdev 

#run owner node
echo "Starting onwer node"
nohup npm run watch &> owner.log 
echo "Point node owner started. Logging to owner.log."

#run visitor node
export NODE_CONFIG_ENV=visitlocal 
echo "Starting visitor node"
nohup npm run watch &> visitor.log 
echo "Point node visitor started. Logging to visitor.log."


