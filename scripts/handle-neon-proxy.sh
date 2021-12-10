#!/bin/bash

# It's all different in the `devnet`

# ENV_FILE=/opt/env/.env
# RUNNABLE=/opt/proxy/run-proxy.sh
# DEPLOY_TRIGGER=deploy

# [[ -f $ENV_FILE ]] && source $ENV_FILE
# [[ -z $EVM_LOADER || $EVM_LOADER == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
# [[ -z $ETH_TOKEN_MINT || $ETH_TOKEN_MINT == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
# [[ -z $COLLATERAL_POOL_BASE || $COLLATERAL_POOL_BASE == "$DEPLOY_TRIGGER" ]] && DEPLOY=1

FILE_TO_PATCH="/opt/proxy/plugin/solana_rest_api_tools.py"

echo
echo "Patching Neon Proxy Solana REST API tools..."
sed -i '871s/2048/9437184/' $FILE_TO_PATCH
echo "Successfully patched Neon Proxy Solana REST API tools:"
sed -n -e 871p $FILE_TO_PATCH
echo
echo

/opt/proxy/run-proxy.sh

# if [ -z $DEPLOY ]; then
#   $RUNNABLE
# else
#   $RUNNABLE | while read LINE; do
#     echo $LINE
#     [[ $LINE == *"EVM_LOADER="* || $LINE == *"ETH_TOKEN_MINT="* || $LINE == *"COLLATERAL_POOL_BASE="* ]] && echo "export $LINE" >> $ENV_FILE
#   done
# fi
