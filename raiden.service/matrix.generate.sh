docker run -it --rm \
    -v $(pwd)/matrix.data:/data \
    -e SYNAPSE_SERVER_NAME=matrix \
    -e SYNAPSE_REPORT_STATS=yes \
    -e UID=1000 \
    -e GID=1000 \
    matrixdotorg/synapse:v1.30.0rc1 generate
