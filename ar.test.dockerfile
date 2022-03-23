### ARWEAVE ####
# file: Dockerfile
FROM ubuntu:20.04

ENV ARWEAVE_VERSION=2.5.1.0
ENV ERLANG_VERSION=1:22.3.4.9-1

# RUN apk update && apk add --no-cache openssh
# RUN apt install --fix-broken && apt update
# RUN DEBIAN_FRONTEND="noninteractive" apt install tzdata -y
# RUN apt install -y openssh-server curl git vim gnupg2
# RUN apt install -y iputils-ping
# RUN mkdir -p /root/.ssh/ && touch /root/.ssh/known_hosts && ssh-keyscan github.com >> /root/.ssh/known_hosts
# RUN git clone --branch feature/testnet --recursive https://github.com/ArweaveTeam/arweave.git /opt/arweave

# WORKDIR /opt/arweave

# RUN wget -q -O arweave-source.tar.gz https://github.com/ArweaveTeam/arweave/archive/refs/tags/N.${ARWEAVE_VERSION}.tar.gz
# RUN tar -zxf ./arweave-source.tar.gz -C /opt/arweave/

# WORKDIR /root/

# RUN wget -q -O erlang_solutions.asc https://packages.erlang-solutions.com/ubuntu/erlang_solutions.asc 
# RUN apt-key add ./erlang_solutions.asc

# RUN echo "deb https://packages.erlang-solutions.com/ubuntu focal contrib" | tee /etc/apt/sources.list.d/erlang.list

RUN apt update && apt install --fix-broken
RUN DEBIAN_FRONTEND="noninteractive" apt install tzdata -y
RUN apt install -y wget
# RUN rm -rf /var/lib/apt/lists/*
# RUN apt update && \
# apt install -y esl-erlang=${ERLANG_VERSION}

WORKDIR /opt/arweave

# RUN wget -q -O arweave-testnet.tar.gz https://arweave.net/m1yHyHttpBzg5oJhPEV3NC7uhRHDZ3S4rPQNCwC5r3Q && tar -zxf ./arweave-testnet.tar.gz -C /opt/arweave/
RUN wget -q -O arweave-release.tar.gz \
https://github.com/ArweaveTeam/arweave/releases/download/N.${ARWEAVE_VERSION}/arweave-${ARWEAVE_VERSION}.linux-x86_64.tar.gz
RUN tar -zxf ./arweave-release.tar.gz -C /opt/arweave/

RUN echo 'fs.file-max=100000000' > /etc/sysctl.conf
RUN mkdir -p /etc/systemd && echo 'DefaultLimitNOFILE=100000000' > /etc/systemd/system.conf

ENTRYPOINT ["/opt/arweave/bin/start"]

# Add metadata to the image to describe which port the container is listening on at runtime.
EXPOSE 1984
