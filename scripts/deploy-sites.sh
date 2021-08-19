#!/bin/bash

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

if [ "$2" == "--contracts" ]; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

if [ $# -eq 0 ]; then
    # No arguments supplied
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
  echo "DEPLOYING: ${SITE}"
  echo

  echo "./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
  ./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v

  echo
  echo "FINISHED: ${SITE}"
  echo
done
