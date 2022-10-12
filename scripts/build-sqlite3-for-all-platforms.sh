#!/bin/bash

# This script is used to build sqlite3 binaries to be packaged by vercel/pkg
# You can add more platforms and archs in the array below

platforms=(darwin win32 linux);
archs=(x64);
libcs=(glibc musl);

backup=$(json -f node_modules/sqlite3/package.json binary.napi_versions)
napis=${backup// /}
napis=${napis//,/ }
napis=${napis##[}
napiversions=${napis%]}

for napiversion in ${napiversions[@]}; do
  json -I -f node_modules/sqlite3/package.json -e "this.binary.napi_versions=[$napiversion]"
  json -f node_modules/sqlite3/package.json binary.napi_versions
  for platform in ${platforms[@]}; do
    for arch in ${archs[@]}; do
      ./node_modules/.bin/node-pre-gyp install --directory=./node_modules/sqlite3 --target_platform=$platform --target_arch=$arch --target_libc=unknown
    done
  done

  for libc in ${libcs[@]}; do
      ./node_modules/.bin/node-pre-gyp install --directory=./node_modules/sqlite3 --target_platform=linux --target_arch=$arch --target_libc=$libc
  done

done

json -I -f node_modules/sqlite3/package.json -e "this.binary.napi_versions=$backup"


