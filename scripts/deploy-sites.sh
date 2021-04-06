#!/bin/bash

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

EXAMPLE_SITES=(./example/*/)

for SITE in ${EXAMPLE_SITES[@]};
do
  echo
  echo "DEPLOYING: ${SITE}"
  echo

  ./point deploy $SITE --datadir ~/.point/test2
  sleep 10

  echo
  echo "FINISHED: ${SITE}"
  echo
done