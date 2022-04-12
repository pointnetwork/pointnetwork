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
peer 65.108.126.145:1984 \
peer 95.217.114.57:1984 \
peer 135.181.137.226:1984 \
peer 72.255.241.138:1984 \
peer 46.189.246.59:1984 \
peer 111.31.51.183:1984 \
peer 45.77.12.202:1984 \
peer 51.161.131.75:1984 \
peer 207.244.233.28:1984 \
peer 194.233.85.31:1984 \
peer 212.25.52.23:1984 \
peer 141.164.57.44:1984 \
peer 90.108.181.249:1985 \
peer 165.227.36.199:1984 \
peer 80.89.203.208:1984 \
peer 101.100.184.77:1984 \
peer 211.180.84.144:1984 \
peer 5.161.49.249:1984
