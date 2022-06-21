FROM node:16.15.0-stretch-slim as builder

ENV GRANAX_USE_SYSTEM_TOR="1"

RUN chmod 1777 /tmp && apt update && apt install -y python3 tor git build-essential && \
    npm install -g npm && PYTHON=$(which python3) 

WORKDIR /app

COPY package.json /app/
COPY package-lock.json /app/
RUN npm i 

FROM node:14.17.5-stretch-slim

RUN npm install -g npm

WORKDIR /app
RUN apt update && apt install -y curl
RUN mkdir -p /data/db
COPY --from=builder /app /app
COPY . /app
RUN npm run build

ENTRYPOINT [ "npm" ]
CMD [ "run", "start" ]
