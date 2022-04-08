#!/bin/bash

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

# Text color for error and warning messages
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ "$2" == "--contracts" ] || [ "$3" == "--contracts" ] ; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

if [ "$2" == "--dev" ] || [ "$3" == "--dev" ]; then
    DEV="--dev"
else
    DEV=""
fi

if [ $# -eq 0 ]; then
    # No arguments supplied
    EXAMPLE_SITES="./example/*"
    DEPLOY_CONTRACTS="--contracts"
else
    EXAMPLE_SITES="./example/${1}*"
fi

for SITE in $EXAMPLE_SITES;
do
  if [ "${SITE}" == "./example/nodemon.json" ]
  then
    echo "SKIPPING ${SITE}"
    continue
  fi
  echo
  if [ -f ${SITE}/package.json ] && [ ! -d ${SITE}/node_modules ]; then
    echo -e "${YELLOW}WARNING${NC}: ZApp has a package.json file but node_modules folder is missing. ${YELLOW}Did you forget to install Zapp dependencies?${NC}"
  fi

  echo
  echo "DEPLOYING: ${SITE}"
  echo

  grep -q upgradable.*true.* ${SITE}/point.deploy.json
  if [ $? == 0 ] && [ "${DEPLOY_CONTRACTS}" != "" ];then
      echo "Upgradable ZApp deployment started"

      cp ${SITE}/contracts/*.sol ./hardhat/contracts/

      echo "npx hardhat compile"
      npx hardhat compile
  fi

  #TODO: Pass the .openzeppeling file to be uploaded to arweave 
  echo "./point deploy $SITE $DEPLOY_CONTRACTS $DEV "
  ./point deploy $SITE $DEPLOY_CONTRACTS $DEV

  echo
  echo "FINISHED: ${SITE}"
  echo
done
