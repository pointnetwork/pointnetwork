FROM ubuntu:20.04

ENV ARWEAVE_VERSION=2.5.1.0

RUN apt update && apt install --fix-broken
RUN apt install -y wget
RUN DEBIAN_FRONTEND="noninteractive" apt install tzdata -y

WORKDIR /opt/arweave

RUN wget -q -O arweave-release.tar.gz \
https://github.com/ArweaveTeam/arweave/releases/download/N.${ARWEAVE_VERSION}/arweave-${ARWEAVE_VERSION}.linux-x86_64.tar.gz
RUN mkdir -p /opt/arweave/dist && tar -zxf ./arweave-release.tar.gz -C /opt/arweave/dist

FROM ubuntu:20.04

RUN apt update && apt install -y build-essential
RUN apt install -y wget
COPY --from=0 /opt/arweave/dist /opt/arweave

WORKDIR /opt/arweave

RUN echo 'session required pam_limits.so' > /etc/pam.d/common-session
RUN echo 'fs.file-max=1048576' > /etc/sysctl.conf
RUN mkdir -p /etc/systemd && echo 'DefaultLimitNOFILE=1048576' > /etc/systemd/system.conf
EXPOSE 1984

ENTRYPOINT ["/opt/arweave/bin/start"]
