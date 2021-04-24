FROM node:10.23.2-stretch-slim as builder

ENV GRANAX_USE_SYSTEM_TOR="1"

WORKDIR /app
COPY . /app/

RUN apt update && apt install -y python3 tor git build-essential &&\
    export PYTHON=$(which python3) &&\
    npm i

FROM node:10.23.2-stretch-slim

WORKDIR /app
COPY --from=builder /app /app
RUN mkdir -p /data/db

ENTRYPOINT [ "./point" ]
CMD [ "--datadir", "/data", "-v" ]
