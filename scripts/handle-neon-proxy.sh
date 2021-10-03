ENV_FILE=/opt/env/.env
RUNNABLE=/opt/proxy/run-proxy.sh
DEPLOY_TRIGGER=deploy

[[ -f $ENV_FILE ]] && source $ENV_FILE
[[ -z $EVM_LOADER || $EVM_LOADER == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
[[ -z $ETH_TOKEN_MINT || $ETH_TOKEN_MINT == "$DEPLOY_TRIGGER" ]] && DEPLOY=1
[[ -z $COLLATERAL_POOL_BASE || $COLLATERAL_POOL_BASE == "$DEPLOY_TRIGGER" ]] && DEPLOY=1

if [ -z $DEPLOY ]; then
  $RUNNABLE
else
  $RUNNABLE | less +F | while read LINE; do
    echo $LINE
    [[ $LINE == *"EVM_LOADER="* || $LINE == *"ETH_TOKEN_MINT="* || $LINE == *"COLLATERAL_POOL_BASE="* ]] && echo $LINE >> $ENV_FILE
  done
fi
