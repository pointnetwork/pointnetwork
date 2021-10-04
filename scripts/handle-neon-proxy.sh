#!/bin/bash

sed -i 's/code_account_size = CODE_INFO_LAYOUT.sizeof() + code_size + valids_size + 2048/code_account_size = CODE_INFO_LAYOUT.sizeof() + code_size + valids_size + 9437184/g' /opt/proxy/plugin/solana_rest_api_tools.py
sed -i 's/code_account_size = CODE_INFO_LAYOUT.sizeof() + msg_size + valids_size + 2048/code_account_size = CODE_INFO_LAYOUT.sizeof() + msg_size + valids_size + 9437184/g' /opt/proxy/plugin/solana_rest_api_tools.py

# sed -n -e 666p -e 897p /opt/proxy/plugin/solana_rest_api_tools.py

/opt/proxy/run-proxy.sh
