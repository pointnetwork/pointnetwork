FROM node:10.23.2-alpine3.11 AS builder

WORKDIR /app

COPY ./* /app

RUN npm install -g yarn && yarn install

