#!/bin/bash

echo "Initializing the raiden node"
echo "Please see https://github.com/raiden-network/raiden/blob/master/docs/private_net_tutorial.rst for details"

# ==============================================================================

source /opt/venv/bin/activate

# export VERSION=$(grep 'CONTRACTS_VERSION = ' -r /opt/venv/lib/python3.7/site-packages/raiden_contracts | awk '{ print $3 }')
export VERSION="0.25.0"
export PRIV_KEY="/keystore/$(ls /keystore/ | grep c01011611e3501c6b3f6dc4b6d3fe644d21ab301)"
export KEY_PSWD="/pswrd"
export MAX_UINT256=115792089237316195423570985008687907853269984665640564039457584007913129639935
export PROVIDER="http://geth:8545"
export STORAGE="/tmp"

echo "Contract Version: $VERSION"
echo "Private key store: $PRIV_KEY"
echo "Max UInt256: $MAX_UINT256"
echo "BC Provider: $PROVIDER"

# ==============================================================================

if [[ -f "$STORAGE/SecretRegistry" && -f "$STORAGE/TokenNetworkRegistry" ]]; then
    echo "Restoring SecretRegistry and TokenNetworkRegistry contract addresses from files"

    export SecretRegistry=$(cat "$STORAGE/SecretRegistry")
    export TokenNetworkRegistry=$(cat "$STORAGE/TokenNetworkRegistry")
else
    echo "Deploying SecretRegistry and TokenNetworkRegistry contracts"

    export RESULT1=$(printf "\n" | python -m raiden_contracts.deploy raiden --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --contracts-version "$VERSION" --max-token-networks "$MAX_UINT256")
    export JSON1=$(echo "$RESULT1" | grep -E "^(\{|\}|\s{4,})")
    export SecretRegistry=$(echo "$JSON1" | python -c "import sys, json; print(json.load(sys.stdin)['SecretRegistry'])")
    export TokenNetworkRegistry=$(echo "$JSON1" | python -c "import sys, json; print(json.load(sys.stdin)['TokenNetworkRegistry'])")

    echo "$SecretRegistry" > "$STORAGE/SecretRegistry"
    echo "$TokenNetworkRegistry" > "$STORAGE/TokenNetworkRegistry"
fi

echo "Captured SecretRegistry contract address: $SecretRegistry"
echo "Captured TokenNetworkRegistry contract address: $TokenNetworkRegistry"

# ==============================================================================

if [ -f "$STORAGE/CustomToken" ]; then
    echo "Restoring Service Token contract address from file"

    export SERVICE_TOKEN=$(cat "$STORAGE/CustomToken")
else
    echo "Deploying Service Token contract"

    export RESULT2=$(printf "\n" | python -m raiden_contracts.deploy token --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-supply 10000000000 --token-name ServiceToken --token-decimals 18 --token-symbol SVT --contracts-version "$VERSION")
    export JSON2=$(echo "$RESULT2" | grep -E "^(\{|\}|\s{4,})")
    export SERVICE_TOKEN=$(echo "$JSON2" | python -c "import sys, json; print(json.load(sys.stdin)['CustomToken'])")

    echo "$SERVICE_TOKEN" > "$STORAGE/CustomToken"
fi

echo "Captured Service Token contract address: $SERVICE_TOKEN"

# ==============================================================================

if [ -f "$STORAGE/UserDeposit" ]; then
    echo "Restoring User Deposit contract address from file"

    export UserDeposit=$(cat "$STORAGE/UserDeposit")
else
    echo "Deploying User Deposit contract"

    export RESULT3=$(printf "\n" | python -m raiden_contracts.deploy services --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-address "$SERVICE_TOKEN" --user-deposit-whole-limit "$MAX_UINT256" --service-deposit-bump-numerator 5 --service-deposit-bump-denominator 4 --service-deposit-decay-constant 100000000 --initial-service-deposit-price 100000000000 --service-deposit-min-price 1000 --service-registration-duration 234000000 --contracts-version "$VERSION" --token-network-registry-address "$TokenNetworkRegistry" --service-registry-controller "0x0000000000000000000000000000000000000000")
    export JSON3=$(echo "$RESULT3" | grep -E "^(\{|\}|\s{4,})")
    export UserDeposit=$(echo "$JSON3" | python -c "import sys, json; print(json.load(sys.stdin)['UserDeposit'])")

    echo "$UserDeposit" > "$STORAGE/UserDeposit"
fi

echo "Captured User Deposit contract address: $UserDeposit"

# ==============================================================================

if [ -f "$STORAGE/TransferToken" ]; then
    echo "Restoring Transfer Token contract address from file"

    export TOKEN=$(cat "$STORAGE/TransferToken")
else
    echo "Deploying Transfer Token contract"

    export RESULT4=$(printf "\n" | python -m raiden_contracts.deploy token --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-supply 10000000000 --token-name Token --token-decimals 18 --token-symbol TKN --contracts-version "$VERSION")
    export JSON4=$(echo "$RESULT4" | grep -E "^(\{|\}|\s{4,})")
    export TOKEN=$(echo "$JSON4" | python -c "import sys, json; print(json.load(sys.stdin)['CustomToken'])")

    echo "$TOKEN" > "$STORAGE/TransferToken"

    export RESULT5=$(printf "\n" | python -m raiden_contracts.deploy register --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --token-address "$TOKEN" --token-network-registry-address "$TokenNetworkRegistry" --contracts-version "$VERSION" --channel-participant-deposit-limit 10000000 --token-network-deposit-limit 1000000000 --wait 120)

    echo "$RESULT5"
fi

echo "Captured Transfer Token contract address: $TOKEN"

raiden --user-deposit-contract-address "$UserDeposit" "$@"
