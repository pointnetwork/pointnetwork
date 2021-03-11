#!/bin/sh

if [ ! "$(ls -A /data)" ]; then
    echo "geth database is empty, running 'geth init'..."
    geth --datadir /data init /genesis.json
    echo "...done!"
fi

geth "$@"
