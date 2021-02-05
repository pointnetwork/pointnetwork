FROM trufflesuite/ganache-cli

RUN echo "ganache-cli -p $PORT -m '$MNEMONIC'" \
    "--account=\"$WEBSITE_OWNER_PUBKEY,$BALANCE\"" \
    "--account=\"$STORAGE_PROVIDER_PUBKEY,$BALANCE\"" \
    "--account=\"$WEBSITE_OWNER_PUBKEY,$BALANCE\"" > \
    /run && chmod +x /run

CMD [ "/run" ]
