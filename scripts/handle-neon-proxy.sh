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
sed -i '871s/2048/50000/' $FILE_TO_PATCH
#9437184
echo "Successfully patched Neon Proxy Solana REST API tools:"
sed -n -e 871p $FILE_TO_PATCH
echo
echo

sed -i '552s/def send_measured_transaction(client, trx, signer, eth_trx, reason):/def send_measured_transaction(client, trx, signer, eth_trx, reason):\n    logger.debug("send_measured_transaction for reason %s: %s ", reason, trx.__dict__)/' $FILE_TO_PATCH
sed -n -e 553p $FILE_TO_PATCH

sed -i '559s/Program failed to complete: exceeded maximum number of instructions allowed/Program failed to complete/' $FILE_TO_PATCH
sed -n -e 559p $FILE_TO_PATCH

echo "Dumping evm_loader and extracting ELF parameters"
export EVM_LOADER="eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU"
solana program dump "$EVM_LOADER" ./evm_loader.dump
export $(/spl/bin/neon-cli --evm_loader="$EVM_LOADER" neon-elf-params ./evm_loader.dump)

/opt/proxy/run-proxy.sh

# if [ -z $DEPLOY ]; then
#   $RUNNABLE
# else
#   $RUNNABLE | while read LINE; do
#     echo $LINE
#     [[ $LINE == *"EVM_LOADER="* || $LINE == *"ETH_TOKEN_MINT="* || $LINE == *"COLLATERAL_POOL_BASE="* ]] && echo "export $LINE" >> $ENV_FILE
#   done
# fi
