#!/bin/sh

DATADIR="/root/.ethereum"

if [ ! "$(ls -A $DATADIR)" ]; then
    echo "Geth database is empty, initializing"
    geth --config="/config.toml" init "/genesis.json"
    echo "Geth is successfully initialized"
fi

geth "$@"
