FROM node:10.23.2-alpine3.10 as builder

WORKDIR /app
COPY . /app/

RUN apk update && \
    apk upgrade && \
    apk add --no-cache git make g++ python3 && \
    ln -sf python3 /usr/bin/python && \
    # mkdir /.npm-global && \
    # NPM_CONFIG_PREFIX=/.npm-global && \
    # npm install -g truffle --unsafe-perm && \
    yarn install

FROM node:10.23.2-alpine3.10

# RUN apk update && \
#     apk upgrade && \
#     apk add --no-cache python3 && \
#     ln -sf python3 /usr/bin/python

WORKDIR /app
COPY --from=builder /app /app

RUN mkdir -p /.point/data/db

CMD [ "/setup.js" ]
