#!/bin/sh

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

if [ $# -eq 0 ]; then
    # No arguments supplied
    EXAMPLE_SITES="./example/*"
else
    EXAMPLE_SITES="./example/${1}*"
fi

if [ "$2" == "--contracts" ]; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

#DATADIR=${1:-~/.point/test2}
DATADIR=~/.point/test2

for SITE in $EXAMPLE_SITES;
do
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
