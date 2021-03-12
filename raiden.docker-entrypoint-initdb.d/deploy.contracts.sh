#!/bin/bash

echo "Initializing the raiden node"

source /opt/venv/bin/activate

# export VERSION=$(grep 'CONTRACTS_VERSION = ' -r /opt/venv/lib/python3.7/site-packages/raiden_contracts | awk '{ print $3 }')
export VERSION="0.25.0"
export PRIV_KEY="/keystore/$(ls /keystore/ | grep c01011611e3501c6b3f6dc4b6d3fe644d21ab301)"
export KEY_PSWD="/pswrd"
export MAX_UINT256=115792089237316195423570985008687907853269984665640564039457584007913129639935
export PROVIDER="http://geth:8545"

echo "Version: $VERSION"
echo "Private key: $PRIV_KEY"
echo "Max UInt256: $MAX_UINT256"
echo "Provider: $PROVIDER"

if [[ -f tmp/SecretRegistry && -f tmp/TokenNetworkRegistry ]]; then
    echo "Restoring contracts from files"

    export SecretRegistry=$(cat /tmp/SecretRegistry)
    export TokenNetworkRegistry=$(cat /tmp/TokenNetworkRegistry)
else
    echo "Deploying contracts"

    export RESULT=$(printf "\n" | python -m raiden_contracts.deploy raiden --rpc-provider "$PROVIDER" --private-key "$PRIV_KEY" --gas-price 10 --gas-limit 6000000 --contracts-version "$VERSION" --max-token-networks "$MAX_UINT256")
    export SecretRegistry=$(echo "$RESULT" | grep -E "^(\{|\}|\s{4,})" | python -c "import sys, json; print(json.load(sys.stdin)['SecretRegistry'])")
    export TokenNetworkRegistry=$(echo "$RESULT" | grep -E "^(\{|\}|\s{4,})" | python -c "import sys, json; print(json.load(sys.stdin)['TokenNetworkRegistry'])")

    echo "$SecretRegistry" > /tmp/SecretRegistry
    echo "$TokenNetworkRegistry" > /tmp/TokenNetworkRegistry
fi

echo "Captured SecretRegistry: $SecretRegistry"
echo "Captured TokenNetworkRegistry: $TokenNetworkRegistry"

echo "Done so far"
