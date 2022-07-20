#!/bin/bash

stopService() {
    if ps aux | grep $1 | grep -v 'grep' > /dev/null 
    then
        echo $1 'running. Stopping process.'
        kill $(ps aux | grep $1 | grep -v 'grep' | awk '{print $2}')
    else 
        echo $1 'already stopped'
    fi
}

echo "Sending kill signal to ganache and arlocal processes"

stopService 'ganache'
stopService 'arlocal'

echo "Finished"
