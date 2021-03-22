#!/bin/bash

echo "Initializing the raiden node"
echo "Please see https://github.com/raiden-network/raiden/blob/master/docs/private_net_tutorial.rst for details"

# cp -R /opt/venv/lib/python3.7/site-packages/raiden_contracts /debug/raiden_contracts
# exit

# cp -R /opt/venv/lib/python3.7/site-packages/raiden_contracts/data_0.25.0 /debug/data_0.25.0
# exit

# ==============================================================================

source /opt/venv/bin/activate

export CURRENT_VERSION=$(grep 'CONTRACTS_VERSION = ' -r /opt/venv/lib/python3.7/site-packages/raiden_contracts | awk '{ print $3 }')
export VERSION="0.25.0"
export PRIV_KEY="/keystore/$(ls /keystore/ | grep c01011611e3501c6b3f6dc4b6d3fe644d21ab301)"
export KEY_PSWD="/pswrd"
export MAX_UINT256=115792089237316195423570985008687907853269984665640564039457584007913129639935
export PROVIDER="http://geth:8545"
export STORAGE="/shared"

echo "Raiden-contracts version: $CURRENT_VERSION"
echo "Contract Version: $VERSION"
echo "Private key store: $PRIV_KEY"
echo "Max UInt256: $MAX_UINT256"
echo "BC Provider: $PROVIDER"

# ==============================================================================

retry() {
    local TRY=0
    local MAX_RETRIES=$1
    local CMD="${@: 2}"

    until [[ $TRY -ge $MAX_RETRIES ]]; do
        local IFS=
        local RESULT=$("$CMD")

        if [ ! -z $RESULT ]; then
            echo "$RESULT"
            break
        else
            ((TRY++))
            echo "Command $CMD failed with result: $RESULT; Try #$TRY" 1>&2
            sleep 1;
        fi
    done
}

check_contract_code() {
    local SCRIPT="
import sys;
sys.path.append('/opt/venv/lib/python3.7/site-packages');
from web3 import Web3;
w3 = Web3(Web3.HTTPProvider('$PROVIDER'));
print(w3.eth.getCode('$1').hex().replace('0x',''));"

    local IFS=
    echo $(python -c "$SCRIPT" 2> /dev/null)
}

deploy() {
    echo $(printf "\n" | python -m raiden_contracts.deploy $@)
}

get_json_value() {
    local KEY=$1
    local INPUT=$2
    local IFS=
    local JSON=$(echo "$INPUT" | grep -E "^(\{|\}|\s{4,})")
    echo $(echo "$JSON" | python -c "import sys, json; print(json.load(sys.stdin)['$KEY'])")
}

# ==============================================================================

deploy_secret_and_token_network_registry() {
    local IFS=
    local RESULT=$(deploy raiden --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --contracts-version "$VERSION" --max-token-networks "$MAX_UINT256")
    local SecretRegistry=$(get_json_value "SecretRegistry" "$RESULT")
    local TokenNetworkRegistry=$(get_json_value "TokenNetworkRegistry" "$RESULT")
    local ServiceRegistryCode=$(check_contract_code "$SecretRegistry")
    local TokenNetworkRegistryCode=$(check_contract_code "$TokenNetworkRegistry")
    [ ! -z $ServiceRegistryCode ] && \
    [ ! -z $TokenNetworkRegistryCode ] && \
    echo "$SecretRegistry,$TokenNetworkRegistry" || \
    echo "Secret and Token Network Registry deployment output: $RESULT
    SecretRegistry: $SecretRegistry
    ServiceRegistryCode: $ServiceRegistryCode
    TokenNetworkRegistry: $TokenNetworkRegistry
    TokenNetworkRegistryCode: $TokenNetworkRegistryCode" 1>&2
}

if [[ -f "$STORAGE/SecretRegistry" && -f "$STORAGE/TokenNetworkRegistry" ]]; then
    echo "Restoring SecretRegistry and TokenNetworkRegistry contract addresses from file"

    export SecretRegistry=$(cat "$STORAGE/SecretRegistry")
    export TokenNetworkRegistry=$(cat "$STORAGE/TokenNetworkRegistry")
else
    echo "Deploying SecretRegistry and TokenNetworkRegistry contracts"

    SecretRegistryAndTokenNetworkRegistry=$(retry 3 deploy_secret_and_token_network_registry)

    export SecretRegistry=$(echo $SecretRegistryAndTokenNetworkRegistry | cut -f1 -d,)
    export TokenNetworkRegistry=$(echo $SecretRegistryAndTokenNetworkRegistry | cut -f2 -d,)

    [[ -z "$SecretRegistry" || -z "$TokenNetworkRegistry" ]] && exit

    echo "$SecretRegistry" > "$STORAGE/SecretRegistry"
    echo "$TokenNetworkRegistry" > "$STORAGE/TokenNetworkRegistry"
fi

echo "SecretRegistry contract address: $SecretRegistry"
echo "TokenNetworkRegistry contract address: $TokenNetworkRegistry"

# ==============================================================================

deploy_service_token() {
    local IFS=
    local RESULT=$(deploy token --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-supply 10000000000 --token-name ServiceToken --token-decimals 18 --token-symbol SVT --contracts-version "$VERSION")
    local ServiceToken=$(get_json_value "CustomToken" "$RESULT")
    local ServiceTokenCode=$(check_contract_code "$ServiceToken")
    [ ! -z $ServiceTokenCode ] && \
    echo "$ServiceToken" || \
    echo "Service Token deployment output: $RESULT
    ServiceToken: $ServiceToken
    ServiceTokenCode: $ServiceTokenCode" 1>&2
}

if [ -f "$STORAGE/ServiceToken" ]; then
    echo "Restoring Service Token contract address from file"

    export SERVICE_TOKEN=$(cat "$STORAGE/ServiceToken")
else
    echo "Deploying Service Token contract"

    SERVICE_TOKEN=$(retry 3 deploy_service_token)

    [[ -z "$SERVICE_TOKEN" ]] && exit

    echo "$SERVICE_TOKEN" > "$STORAGE/ServiceToken"
fi

echo "Captured Service Token contract address: $SERVICE_TOKEN"

# ==============================================================================

deploy_user_deposit_related_contracts() {
    local IFS=
    local RESULT=$(deploy services --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-address "$SERVICE_TOKEN" --user-deposit-whole-limit "$MAX_UINT256" --service-deposit-bump-numerator 5 --service-deposit-bump-denominator 4 --service-deposit-decay-constant 100000000 --initial-service-deposit-price 100000000000 --service-deposit-min-price 1000 --service-registration-duration 234000000 --contracts-version "$VERSION" --token-network-registry-address "$TokenNetworkRegistry" --service-registry-controller "0x0000000000000000000000000000000000000000")

    local ServiceRegistry=$(get_json_value "ServiceRegistry" "$RESULT")
    local UserDeposit=$(get_json_value "UserDeposit" "$RESULT")
    local MonitoringService=$(get_json_value "MonitoringService" "$RESULT")
    local OneToN=$(get_json_value "OneToN" "$RESULT")

    local ServiceRegistryCode=$(check_contract_code "$ServiceRegistry")
    local UserDepositCode=$(check_contract_code "$UserDeposit")
    local MonitoringServiceCode=$(check_contract_code "$MonitoringService")
    local OneToNCode=$(check_contract_code "$OneToN")

    [ ! -z $ServiceRegistryCode ] && \
    [ ! -z $UserDepositCode ] && \
    [ ! -z $MonitoringServiceCode ] && \
    [ ! -z $OneToNCode ] && \
    echo "$ServiceRegistry,$UserDeposit,$MonitoringService,$OneToN" || \
    echo "User Deposit services deployment output: $RESULT
    ServiceRegistry: $ServiceRegistry
    ServiceRegistryCode: $ServiceRegistryCode
    UserDeposit: $UserDeposit
    UserDepositCode: $UserDepositCode
    MonitoringService: $MonitoringService
    MonitoringServiceCode: $MonitoringServiceCode
    OneToN: $OneToN
    OneToNCode: $OneToNCode" 1>&2
}

if [ -f "$STORAGE/UserDeposit" ]; then
    echo "Restoring User Deposit contract address from file"

    export UserDeposit=$(cat "$STORAGE/UserDeposit")
    export ServiceRegistry=$(cat "$STORAGE/ServiceRegistry")
    export MonitoringService=$(cat "$STORAGE/MonitoringService")
    export OneToN=$(cat "$STORAGE/OneToN")
else
    echo "Deploying User Deposit contract"

    UserDepositAndServices=$(retry 3 deploy_user_deposit_related_contracts)

    export ServiceRegistry=$(echo $UserDepositAndServices | cut -f1 -d,)
    export UserDeposit=$(echo $UserDepositAndServices | cut -f2 -d,)
    export MonitoringService=$(echo $UserDepositAndServices | cut -f3 -d,)
    export OneToN=$(echo $UserDepositAndServices | cut -f4 -d,)

    [[ -z "$ServiceRegistry" || -z "$UserDeposit" || -z "$MonitoringService" || -z "$OneToN" ]] && exit

    echo "$ServiceRegistry" > "$STORAGE/ServiceRegistry"
    echo "$UserDeposit" > "$STORAGE/UserDeposit"
    echo "$MonitoringService" > "$STORAGE/MonitoringService"
    echo "$OneToN" > "$STORAGE/OneToN"
fi

echo "Captured Service Registry contract address: $ServiceRegistry"
echo "Captured User Deposit contract address: $UserDeposit"
echo "Captured Monitoring Service contract address: $MonitoringService"
echo "Captured One To N contract address: $OneToN"

# ==============================================================================

deploy_transfer_token() {
    local IFS=
    local RESULT=$(deploy token --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-supply 10000000000 --token-name Token --token-decimals 18 --token-symbol TKN --contracts-version "$VERSION")
    local TransferToken=$(get_json_value "CustomToken" "$RESULT")
    local TransferTokenCode=$(check_contract_code "$TransferToken")
    [ ! -z $TransferTokenCode ] && \
    echo "$TransferToken" || \
    echo "Transfer Token deployment output: $RESULT
    TransferToken: $TransferToken
    TransferTokenCode: $TransferTokenCode" 1>&2
}

# register_transfer_token() {
#     local IFS=
#     local RESULT=$(deploy register --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-address "$TOKEN" --token-network-registry-address "$TokenNetworkRegistry" --contracts-version "$VERSION" --channel-participant-deposit-limit 10000000 --token-network-deposit-limit 1000000000 --wait 120)
#     [ ! -z $TransferTokenCode ] && \
#     echo "$RESULT" || \
#     echo "Transfer Token registration output: $RESULT" 1>&2
# }

if [ -f "$STORAGE/TransferToken" ]; then
    echo "Restoring Transfer Token contract address from file"

    export TOKEN=$(cat "$STORAGE/TransferToken")
else
    echo "Deploying Transfer Token contract"

    TOKEN=$(retry 3 deploy_transfer_token)

    [[ -z "$TOKEN" ]] && exit

    echo "$TOKEN" > "$STORAGE/TransferToken"

    echo "Registring Transfer Token"

    export TransferTokenRegistration=$(deploy register --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-address "$TOKEN" --token-network-registry-address "$TokenNetworkRegistry" --contracts-version "$VERSION" --channel-participant-deposit-limit 10000000 --token-network-deposit-limit 1000000000 --wait 120)

    [[ -z "$TransferTokenRegistration" ]] && exit

    echo "Transfer Token Registration result: $TransferTokenRegistration"
fi

echo "Captured Transfer Token contract address: $TOKEN"

# ==============================================================================

/opt/venv/bin/python3 -m raiden \
    --user-deposit-contract-address "$UserDeposit" \
    --monitoring-service-contract-address "$MonitoringService" \
    --one-to-n-contract-address "$OneToN" \
    --service-registry-contract-address "$ServiceRegistry" \
    --secret-registry-contract-address "$SecretRegistry" \
    --tokennetwork-registry-contract-address "$TokenNetworkRegistry" \
    "$@"
