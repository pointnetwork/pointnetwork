FROM node:10.23.2-alpine3.10

RUN npm i -g truffle

WORKDIR /truffle

ENTRYPOINT [ "/truffle/run.js" ]
