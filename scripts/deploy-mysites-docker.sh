#!/bin/bash

TARGET=${1:-pointnetwork_website_owner}

docker exec -it $TARGET /app/scripts/deploy-mysites.sh