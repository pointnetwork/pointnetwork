FROM ubuntu:18.04

ARG SOLANA_VERSION=v1.7.9

RUN apt-get update \
&& apt-get install -y curl git \
&& git clone https://github.com/solana-labs/solana.git -b $SOLANA_VERSION /opt/solana \
&& cd /opt/solana \
&& curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y \
&& . $HOME/.cargo/env \
&& . ./ci/rust-version.sh \
&& env && echo "Installing rust version: $rust_stable" \
&& rustup install $rust_stable \
&& rustup component add rustfmt \
&& apt-get install -y git libssl-dev libudev-dev pkg-config zlib1g-dev llvm clang make \
&& cargo build --verbose --jobs 1

ENV PATH=$PATH:/opt/solana/target/debug

WORKDIR /opt/solana

# && echo "#!/bin/bash" $(cat ./ci/rust-version.sh) > ./ci/rust-version.sh \
