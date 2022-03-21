#!/bin/sh
if [ ! -d /root/data/geth ]; then
    echo "/root/data/geth not found, running 'geth init'..."
    geth init /root/geth-genesis.json --datadir /root/data
    echo "...done!"
fi

geth "$@"