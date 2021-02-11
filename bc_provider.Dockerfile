FROM trufflesuite/ganache-cli

COPY bc_provider.setup.sh /setup.sh
RUN chmod +x /setup.sh

CMD [ "/setup.sh" ]
