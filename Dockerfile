FROM node:10.23.2-stretch-slim as builder

ENV GRANAX_USE_SYSTEM_TOR="1"

WORKDIR /app
COPY . /app/

RUN apk update && \
    apk upgrade && \
    apk add git make g++ python3 tor --update-cache --repository http://dl-3.alpinelinux.org/alpine/edge/testing/ && \
    rm -rf /var/cache/apk/* && \
    mkdir -p /etc/tor/ && \
    echo "SocksPort 0.0.0.0:9050" > /etc/tor/torrc.default && \
    ln -sf python3 /usr/bin/python && \
    npm i

FROM node:10.23.2-stretch-slim

WORKDIR /app
COPY --from=builder /app /app
RUN mkdir -p /data/db

ENTRYPOINT [ "./point" ]
CMD [ "--datadir", "/data", "-v" ]
