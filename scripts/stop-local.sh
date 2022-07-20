#!/bin/bash
echo "Sending kill signal to ganache and arlocal processes"

kill $(ps aux | grep 'ganache' | grep -v 'grep' | awk '{print $2}')
kill $(ps aux | grep 'arlocal' | grep -v 'grep' | awk '{print $2}')

echo "Finished"