FROM node:10.23.2-stretch-slim as builder

ENV GRANAX_USE_SYSTEM_TOR="1"

WORKDIR /app
COPY . /app/

RUN apt update && \
    apt install -y tor git wget build-essential \
    zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libreadline-dev libffi-dev &&\
    wget https://www.python.org/ftp/python/3.9.4/Python-3.9.4.tgz &&\
    tar xzf Python-3.9.4.tgz &&\
    cd Python-3.9.4 &&\
    ./configure --enable-optimizations &&\
    make altinstall &&\
    export PYTHON=$(which python3.9) &&\
    npm i

FROM node:10.23.2-stretch-slim

WORKDIR /app
COPY --from=builder /app /app
RUN mkdir -p /data/db

ENTRYPOINT [ "./point" ]
CMD [ "--datadir", "/data", "-v" ]
