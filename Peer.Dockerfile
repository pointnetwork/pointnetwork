FROM node:10.23.2-alpine3.11

WORKDIR /app

COPY ./* /app/

# RUN npm install -g yarn && \
#     yarn install && \
#     mkdir -p /.point/data/db && \
#     touch /setup.js && \
#     chmod +x /setup.js && \
#     /setup.js

RUN apk update && apk upgrade && apk add --no-cache git make g++ python3 && ln -sf python3 /usr/bin/python
RUN yarn install
RUN mkdir -p /.point/data/db
RUN touch /setup.js
RUN chmod +x /setup.js
RUN /setup.js

CMD [ "./point", "--datadir", "/.point" ]
