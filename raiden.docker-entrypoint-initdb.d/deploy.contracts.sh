#!/bin/sh

echo "Initializing the raiden node"

source /opt/venv/bin/activate

export VERSION=$(grep 'CONTRACTS_VERSION = ' -r /opt/venv/lib/python3.7/site-packages/raiden_contracts | awk '{ print $3 }')
export PRIV_KEY=$(ls /keystore/)
export MAX_UINT256=115792089237316195423570985008687907853269984665640564039457584007913129639935
export PROVIDER="http://geth:8545"

echo "Version: $VERSION"
echo "Private key: $PRIV_KEY"
echo "Max UInt256: $MAX_UINT256"
echo "Provider: $PROVIDER"

ls -ahl /opt/venc/lib/python3.7/site-packages/raiden_contracts

export RESULT=$(python -m raiden_contracts.deploy raiden --rpc-provider $PROVIDER --private-key $PRIV_KEY --gas-price 10 --gas-limit 6000000 --contracts-version $VERSION --max-token-networks $MAX_UINT256)

echo "Result: $RESULT"

echo "Done so far"
