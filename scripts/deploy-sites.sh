#!/bin/sh

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

#DATADIR=${1:-~/.point/test2}
DATADIR=~/.point/test2

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

#  [ -d $SITE/contracts ] && sleep 10
  echo "./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
  ./point deploy $SITE --datadir $DATADIR $DEPLOY_CONTRACTS -v

  echo
  echo "FINISHED: ${SITE}"
  echo
done
