FROM golang:1.18.0-bullseye

RUN go install github.com/0xPolygon/polygon-edge@develop

WORKDIR /cluster

COPY ./polygon_cluster_cfg .

# it creates the genesis block, sets the bootnodes and premine to a given address
# if you want to modify this config you should remove genesis.json file and uncomment
# the run command below. By default the genesis.json file is going to be used

# RUN polygon-edge genesis --consensus ibft --ibft-validators-prefix-path test-chain- \
#   --bootnode /ip4/127.0.0.1/tcp/10001/p2p/16Uiu2HAmHqmvrTQzyHTNUJnKiRE8ZAJ18Qb814T8xEHbwXmY8zBE \
#   --bootnode /ip4/127.0.0.1/tcp/10001/p2p/16Uiu2HAmD2nF4Kkb8rHro8RhSuRzAvVyBVf1ZgHTdD62FhjkcVwS \
#   --premine=0x011967d88c6b79116bb879d4c2bc2c3caa23569edd85dfe0bc596846837bbc8e:1000000000000000000000

CMD /cluster/start_cluster.sh
