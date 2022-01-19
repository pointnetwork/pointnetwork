#!/bin/bash

# This script is intended to be run by the exxternal point-deploy executable
# See README-DEPLOYSPACE.md document for details on how this is called.

DEPLOY_CONTRACTS="--contracts"
DEPLOYSPACE="./deployspace"

echo "DEPLOYING from DEPLOYSPACE"
echo

# Expects to be a single Zapp in deployspace
echo "./point deploy $DEPLOYSPACE --datadir $DATADIR $DEPLOY_CONTRACTS -v"
./point deploy $DEPLOYSPACE --datadir $DATADIR $DEPLOY_CONTRACTS -v

echo
echo "FINISHED!"
echo
