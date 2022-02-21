#!/bin/bash

# This script is used to build sqlite3 binaries to be packaged by vercel/pkg
# You can add more platforms and archs in the array below

platforms=(darwin linux win32);
archs=(x64);

for platform in ${platforms[@]}; do
  for arch in ${archs[@]}; do
    ./node_modules/.bin/node-pre-gyp install --directory=./node_modules/sqlite3 --target_platform=$platform --target_arch=$arch
  done
done
