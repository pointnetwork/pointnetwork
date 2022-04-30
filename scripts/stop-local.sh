#!/bin/bash
echo "Sending SIGKILL to all node processes"
killall node -v -s KILL
echo "Finished"
