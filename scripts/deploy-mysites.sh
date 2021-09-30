#!/bin/bash

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-mysites.sh mysite.z --contracts

if [ "$2" == "--contracts" ]; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

if [ $# -eq 0 ]; then
    # No arguments supplied
    MYSITES="./mysites/*"
    DEPLOY_CONTRACTS="--contracts"
else
    MYSITES="./mysites/${1}*"
fi

for SITE in $MYSITES;
do
  echo
  echo "DEPLOYING: ${SITE}"
  echo

  echo "./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
  ./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v

  echo
  echo "FINISHED: ${SITE}"
  echo
done
