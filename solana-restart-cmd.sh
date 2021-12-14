slot=$(solana -v slot --commitment confirmed) # solana-ledger-tool bounds -l config/ledger/
bankHash=$(solana-ledger-tool -l config/ledger bank-hash)

# BLdx4wURRUBC6Aqpmn9stXTTue8ktnjQGYz8vaYzbZZC

solana-validator \
--identity /opt/solana/config/run/validator-identity.json \
--vote-account /opt/solana/config/run/validator-vote-account.json \
--ledger /opt/solana/config/ledger \
--gossip-host localhost \
--gossip-port 8001 \
--rpc-port 8899 \
--rpc-faucet-address 127.0.0.1:9900 \
--log ./tmp-2021-12-01.log \
--enable-rpc-transaction-history \
--enable-cpi-and-log-storage \
--init-complete-file /opt/solana/config/run/init-completed \
--snapshot-compression none \
--require-tower \
--no-wait-for-vote-to-start-leader \
--wait-for-supermajority 5946326 \
--no-snapshot-fetch \
--no-genesis-fetch \
--expected-bank-hash "$bankHash" \
--expected-shred-version 40450 # \
# --trusted-validator 4Btdk4wcuDXaxvYMjVyKAr9uyuBt6kKhafkHgV4WCRk2
