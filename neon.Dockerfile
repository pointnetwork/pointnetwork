FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive
RUN apt update && apt install -y \
rustc \
python3 \
git \
libssl-dev \
libudev-dev \
pkg-config \
zlib1g-dev \
llvm \
clang \
make

RUN git clone https://github.com/neonlabsorg/solana.git && \
git clone https://github.com/solana-labs/solana-program-library.git && \
git clone https://github.com/neonlabsorg/proxy-model.py.git

RUN echo 'root soft nofile 500000' >> /etc/security/limits.conf && \
echo 'root hard nofile 500000' >> /etc/security/limits.conf

RUN cd solana && git checkout v1.6.9-resources && cargo build --workspace --release && cd ..
