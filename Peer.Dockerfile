FROM node:10.23.2-alpine3.11 as builder

WORKDIR /app
COPY . /app/

RUN apk update && \
    apk upgrade && \
    apk add --no-cache git make g++ python3 && \
    ln -sf python3 /usr/bin/python && \
    yarn install

FROM node:10.23.2-alpine3.11

WORKDIR /app
COPY --from=builder /app /app

RUN ls -ahl /app
RUN ls -ahl /app/resources
RUN cat /app/resources/defaultConfig.json

RUN mkdir -p /.point/data/db && \
    touch /setup.js && \
    chmod +x /setup.js && \
    /setup.js

RUN echo 'all is set up'

CMD [ "./point", "--datadir", "/.point" ]
