FROM ubuntu:18.04 AS raiden-loader

RUN apt update
RUN apt install -y wget
RUN apt-get install -y unzip

# RUN wget "https://github.com/raiden-network/raiden/archive/refs/tags/v0.100.3-rc6.zip"
# RUN mkdir raiden && unzip "v0.100.3-rc6.zip"

RUN wget "https://github.com/raiden-network/raiden/archive/refs/tags/v1.2.0.zip"
RUN unzip "v1.2.0.zip"

# ==============================================================================

FROM ubuntu:18.04

# NAME="Ubuntu"
# VERSION="18.04.5 LTS (Bionic Beaver)"
# ID=ubuntu
# ID_LIKE=debian
# PRETTY_NAME="Ubuntu 18.04.5 LTS"
# VERSION_ID="18.04"
# HOME_URL="https://www.ubuntu.com/"
# SUPPORT_URL="https://help.ubuntu.com/"
# BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
# PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
# VERSION_CODENAME=bionic
# UBUNTU_CODENAME=bionic

RUN apt update
RUN apt install -y software-properties-common
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt install -y python3.7
RUN apt-get install -y libncurses5-dev
RUN ln -s $(which python3.7) /usr/bin/python
RUN apt-get install -y python3-pip
RUN ln -s $(which pip3) /usr/bin/pip
RUN pip install pip-tools
# RUN pip install virtualenv

# COPY --from=raiden-loader /raiden-0.100.3-rc6 /priv_chain/raiden
COPY --from=raiden-loader /raiden-1.2.0 /raiden

WORKDIR /raiden

RUN make install-dev

ENTRYPOINT [ "/bin/bash" ]
