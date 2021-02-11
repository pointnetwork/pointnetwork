#!/bin/bash

echo "Starting truffle $PORT -m $MNEMONIC --account=\"$WEBSITE_OWNER_PUBKEY,$BALANCE\" --account=\"$STORAGE_PROVIDER_PUBKEY,$BALANCE\" --account=\"$WEBSITE_OWNER_PUBKEY,$BALANCE\""

ganache-cli -p $PORT -m $MNEMONIC \
    --account="$WEBSITE_OWNER_PUBKEY,$BALANCE" \
    --account="$STORAGE_PROVIDER_PUBKEY,$BALANCE" \
    --account="$WEBSITE_OWNER_PUBKEY,$BALANCE"

