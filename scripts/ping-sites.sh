#!/bin/bash

# This script will make a request to the site root all the
# websites under the 'example' folder

# NOTE: You need to start up Point Network
# AND deploy all the sites before running this script!

# Run this script from within the project root folder like so:
# ./scripts/ping-sites.sh
# Anything other than a 200 response indicates trouble! :)

EXAMPLE_SITES=(./example/*/)

for SITE in ${EXAMPLE_SITES[@]};
do
  DOMAIN="${SITE/.\/example\//}" # replace './example/'
  DOMAIN="${DOMAIN///}" # replace the trailing '/'

  echo "REQUESTING: ${DOMAIN}"
  echo

  curl -s -o /dev/null -w "%{http_code}" -H "Host: ${DOMAIN}" http://localhost:65501

  echo
  echo
  echo "FINISHED: ${DOMAIN}"
  echo
done