#!/bin/bash

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

# Text color for error and warning messages
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ "$2" == "--contracts" ]; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

if [ $# -eq 0 ] || [ "$MODE" == "e2e" ]; then
    # No arguments supplied or mode === e2e
    EXAMPLE_SITES="./example/*"
    DEPLOY_CONTRACTS="--contracts"
else
    EXAMPLE_SITES="./example/${1}*"
fi

# If DATADIR ENV var is not set ...
if [[ -z "${DATADIR}" ]]; then
  DATADIR=~/.point/test2
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

  echo "./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
  ./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v

  echo
  echo "FINISHED: ${SITE}"
  echo
done
