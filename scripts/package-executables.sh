#!/bin/bash

# This script will rename, add execution permissions and compress point executables.

for FILE in ./bin/*; do
  chmod +x $FILE
  tmp=${FILE#*-};
  PLATFORM=${tmp%.*}
  EXTENSION=${tmp#*\.};
  mkdir ./bin/$PLATFORM;
  if [ "$tmp" == "$EXTENSION" ]; then
    mv $FILE ./bin/$PLATFORM/point
  else
    mv $FILE ./bin/$PLATFORM/point.$EXTENSION
  fi
  tar -czvf ./bin/point-$PLATFORM.tar.gz ./bin/$PLATFORM
  rm -rf ./bin/$PLATFORM
done
