#!/bin/bash

# This script is intended to be run by the exxternal point-deploy executable
# See README-DEPLOYSPACE.md document for details on how this is called.

if [ "$1" == "--contracts" ]; then
    DEPLOY_CONTRACTS="--contracts"
else
    DEPLOY_CONTRACTS=""
fi

DEPLOYSPACE="./deployspace"

echo "DEPLOYING from DEPLOYSPACE"
echo

# Expects to be a single Zapp in deployspace
echo "./point deploy $DEPLOYSPACE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
./point deploy $DEPLOYSPACE --datadir $DATADIR $DEPLOY_CONTRACTS -v

echo
echo "FINISHED!"
echo
