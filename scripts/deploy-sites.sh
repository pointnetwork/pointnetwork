#!/bin/sh

# NOTE: You need to start up Point Network before running this!
# Run this script from within the project root folder like so:
# ./scripts/deploy-sites.sh

EXAMPLE_SITES="./example/*"
if [ $# -eq 0 ]; then
  ARGS="--datadir ~/.point/test2"
else
  ARGS="$@"
fi

for SITE in $EXAMPLE_SITES;
do
  echo
  echo "DEPLOYING: ${SITE}"
  echo

  ./point deploy $SITE $ARGS
  sleep 10

  echo
  echo "FINISHED: ${SITE}"
  echo
done

if [ $# -eq 0 ]; then
  exit
fi

./point $ARGS
