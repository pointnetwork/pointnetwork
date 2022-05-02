FROM ethereum/solc:0.8.6 AS solc

FROM node:16.15.0-alpine

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /hardhat

#is this even safe bro?
RUN npm -g config set user root

RUN apk update && apk add --no-cache git

COPY hardhat/package.json ./
RUN npm install

ENTRYPOINT ["npm", "start"]

