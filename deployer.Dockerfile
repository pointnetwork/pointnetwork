FROM ethereum/solc:0.8.6 AS solc

FROM node:14.17.5-alpine

COPY --from=solc /usr/bin/solc /usr/bin/solc

WORKDIR /hardhat

#is this even safe bro?
RUN npm -g config set user root

#Check without bitch
RUN apk update && apk add --no-cache git

#We'd rather be in Vice City
COPY hardhat/package.json ./
COPY hardhat/package-lock.json ./
RUN npm install

ENTRYPOINT ["npm", "start"]

