#!/bin/bash

ENV_FILE=/opt/env/.env
RUNNABLE=/opt/proxy/run-proxy.sh
DEPLOY_TRIGGER=deploy

[[ -f $ENV_FILE ]] && source $ENV_FILE
[[ -z $EVM_LOADER || $EVM_LOADER == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
[[ -z $ETH_TOKEN_MINT || $ETH_TOKEN_MINT == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
[[ -z $COLLATERAL_POOL_BASE || $COLLATERAL_POOL_BASE == "$DEPLOY_TRIGGER" ]] && DEPLOY=1

sed -i 's/code_account_size = CODE_INFO_LAYOUT.sizeof() + code_size + valids_size + 2048/code_account_size = CODE_INFO_LAYOUT.sizeof() + code_size + valids_size + 9437184/g' /opt/proxy/plugin/solana_rest_api_tools.py
sed -i 's/code_account_size = CODE_INFO_LAYOUT.sizeof() + msg_size + valids_size + 2048/code_account_size = CODE_INFO_LAYOUT.sizeof() + msg_size + valids_size + 9437184/g' /opt/proxy/plugin/solana_rest_api_tools.py

# sed -n -e 666p -e 897p /opt/proxy/plugin/solana_rest_api_tools.py

if [ -z $DEPLOY ]; then
  $RUNNABLE
else
  $RUNNABLE | while read LINE; do
    echo $LINE
    [[ $LINE == *"EVM_LOADER="* || $LINE == *"ETH_TOKEN_MINT="* || $LINE == *"COLLATERAL_POOL_BASE="* ]] && echo "export $LINE" >> $ENV_FILE
  done
fi
