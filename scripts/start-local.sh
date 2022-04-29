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
cd hardhat
rm -rf cache
rm -rf typechain
rm -rf build
npx hardhat compile
npm start
cd ..

export NODE_CONFIG_ENV=devlocal 
export MODE=zappdev 

#run owner node
echo "Starting onwer node"
npm run watch & 
echo "Point node owner started. Logging to owner.log."

#run visitor node
export NODE_CONFIG_ENV=visitlocal 
echo "Starting visitor node"
npm run watch & 
echo "Point node visitor started. Logging to visitor.log."


