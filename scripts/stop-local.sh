#!/bin/bash
echo "Sending kill signal to ganache and arlocal processes"

kill $(ps aux | grep 'ganache' | awk '{print $2}')
kill $(ps aux | grep 'arlocal' | awk '{print $2}')

echo "Finished"