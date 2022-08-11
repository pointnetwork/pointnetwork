FROM golang:1.18.0-bullseye
RUN apt-get update
RUN apt-get install -y git jq socat
WORKDIR evmos
RUN git clone https://github.com/evmos/evmos.git .
COPY ./init.sh /go/evmos/init.sh
COPY ./init.go /go/evmos/cmd/evmosd/init.go

RUN make install
ENTRYPOINT ["bash", "./init.sh"]


# curl -X POST --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' -H "Content-Type: application/json" http://localhost:7545