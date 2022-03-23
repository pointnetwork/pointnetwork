#!/bin/bash

echo "fs.file-max=100000000" > /etc/sysctl.conf
mkdir -p /etc/systemd
echo "DefaultLimitNOFILE=100000000" > /etc/systemd/system.conf

/opt/arweave/erts-12.1/bin/epmd -daemon && \
/opt/arweave/bin/start mine \
mining_addr $MINER_ADDRESS \
data_dir $DATA_DIR \
requests_per_minute_limit $MAX_REQUESTS_PER_MIN \
disk_space $DISK_SPACE \
tx_propagation_parallelization 3 \
max_emitters 1 \
max_miners 1 \
enable arql_tags_index \
peer 188.166.200.45 \
peer 188.166.192.169 \
peer 163.47.11.64 \
peer 139.59.51.59 \
peer 138.197.232.192 \
peer 159.203.158.108 \
peer 138.197.232.192 \
peer 134.209.27.233 \
peer 167.71.128.173 \
peer 134.209.27.239 \
peer 209.97.191.10 \
peer 46.101.67.172
