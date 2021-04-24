#!/bin/bash

[[ -f /data/point.pid ]] && rm /data/point.pid
[[ -f /data/data/db/LOCK ]] && rm /data/data/db/LOCK

/app/scripts/await-contracts-docker.js && /app/point "$@"
