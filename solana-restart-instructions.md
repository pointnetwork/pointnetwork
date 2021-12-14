Mainnet-Beta 1.6.24 Restart

The restart will start from the highest optimistically confirmed slot, which was found by running

solana -v slot --commitment confirmed

Highest optimistically confirmed slot should read: 96542804


Note: If your last confirmed slot is lower than that the one listed below, this is likely your node crashed before it was able to observe the latest supermajority. If this is the case, follow Step 0 and continue with the steps in the appendix.


Important: DO NOT delete your ledger directory



NOTE: A previous version of this document had Validators upgrade to v1.6.24 before creating the snapshot. These instructions have been updated.  

Step 0: Create a snapshot at slot 96542804
This document assumes your ledger directory is called ledger/.  If not then adjust the following commands accordingly.

Use the ledger tool to create a new snapshot at slot 96542804, replacing the two instances of <ledger path> to your actual ledger path:

$ solana-ledger-tool --ledger <ledger path> create-snapshot 96542804 <ledger path> --hard-fork 96542804
 
The final line of output should be “Shred version: 6012”, and this snapshot file should now exist: 
ledger/snapshot-96542804-AU3VF7nPPU7AJ93Rg5YAy7P4QUd8hnYo3jFqeMJaTNBT.tar.zst

Check your ledger/ directory to ensure that you have no snapshot newer than ledger/snapshot-96542804-AU3.. This is very unlikely, but if found should be removed.   Snapshots older than ledger/snapshot-96542804-AU3.. should not be removed.

NOTE: If you receive “Error: Slot 96542804 is not available”, please see appendix
Step 1: Install the v1.6.24 Solana release
This document assumes your ledger directory is called ledger/.  If not then adjust the following commands accordingly.

https://github.com/solana-labs/solana/releases/tag/v1.6.24 
Step 2: Adjust your validator command-line arguments, temporarily for this restart to include:

--wait-for-supermajority 96542804
--no-snapshot-fetch
--no-genesis-fetch
--expected-bank-hash 5x6cLLsvsEbgbQxQNPoT1LvbTfYrx22kpXyzRxLKAMN3
--expected-shred-version 6012
--trusted-validator ba1cUvbuGe7k2Um2YKmRnR7ZAy3sK9mQKJkMCGVhcov
--trusted-validator ba2eZEU27TqR1MB9WUPJ2F7dcTrNsgdx38tBg53GexZ
--trusted-validator ba3zMkMp87HZg27Z7EDEkxE48zcKgJ59weFYtrKadY7
--trusted-validator ba4MuwPdsx6DKXY6vVCbheAi5UTiMgmBefCGbVhfeQY
--trusted-validator ba5rfuZ37gxhrLcsgA5fzCg8BvSQcTERPqY14Qffa3J
--trusted-validator ba6wkJVhenDL2HpH8bYLVEMKwCgo21cJm9AmPEEVMFi
--trusted-validator F77qhZH7Net35Hz2EVUoqyUQuSMdSwxnLRwZZsAcN9X6


(Remove the previous value of “--expected-shred-version 13490“ if present)

Once the cluster restarts and normal operation resumes, remember to remove these arguments. They are only required for the restart. 

Step 3: Start your validator
As it boots, it will load the snapshot for slot 96542804 and wait for 80% of the stake to come online before producing/validating new blocks. 

To confirm your restarted validator is correctly waiting for 80% stake, look for this periodic log message to confirm it is waiting:
INFO  solana_core::validator] Waiting for 80% of activated stake at slot 96542804 to be in gossip...

And if you have RPC enabled, ask it repeated for the current slot:
$ solana --url http://127.0.0.1:8899 slot 96542804

Any number other than 96542804 means you did not complete the steps correctly.

Appendix: Resolution if you did not preserve your ledger

NOT RECOMMENDED - this resolution should only be attempted if your ledger/ directory is unavailable. 

If your ledger history is corrupt or otherwise unavailable, delete your ledger/ directory instead of Steps 1, then complete Steps 3.

Add these arguments to restart:
--wait-for-supermajority 96542804
--expected-shred-version 6012
--expected-bank-hash 5x6cLLsvsEbgbQxQNPoT1LvbTfYrx22kpXyzRxLKAMN3
--trusted-validator ba1cUvbuGe7k2Um2YKmRnR7ZAy3sK9mQKJkMCGVhcov
--trusted-validator ba2eZEU27TqR1MB9WUPJ2F7dcTrNsgdx38tBg53GexZ
--trusted-validator ba3zMkMp87HZg27Z7EDEkxE48zcKgJ59weFYtrKadY7
--trusted-validator ba4MuwPdsx6DKXY6vVCbheAi5UTiMgmBefCGbVhfeQY
--trusted-validator ba5rfuZ37gxhrLcsgA5fzCg8BvSQcTERPqY14Qffa3J
--trusted-validator ba6wkJVhenDL2HpH8bYLVEMKwCgo21cJm9AmPEEVMFi
--trusted-validator F77qhZH7Net35Hz2EVUoqyUQuSMdSwxnLRwZZsAcN9X6



