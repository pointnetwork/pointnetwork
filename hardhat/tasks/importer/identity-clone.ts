import { task } from "hardhat/config";
import fs = require('fs');

//npx hardhat identity-clone 0x1411f3dC11D60595097b53eCa3202c34dbee0CdA --from ynet_social --to social --network ynet

task("identity-clone", "Will clone all ikv values from one identity to another")
  .addPositionalParam("contract","Identity contract source address")
  .addOptionalParam("from", "Saves migration file to specific directory")
  .addOptionalParam("to", "Migration file to when uploading data")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;

    if(!ethers.utils.isAddress(taskArgs.contract)) {
        console.log('Contract not valid.');
        return false;
    }

    const contract = await hre.ethers.getContractAt("Identity", taskArgs.contract);

    const fileStructure = {
        ikv: []
    } as any;

    let ikvSetFilter = contract.filters.IKVSet();
    let ikvSetEvents = await contract.queryFilter(ikvSetFilter);

    console.log(`Found ${ikvSetEvents.length} IKV parameters`);

    for(const e of ikvSetEvents) {
        if(e.args) {
            const {identity, key, value, version} = e.args;

            if(identity == taskArgs.from){
                console.log(`migrating key ${key} with value of ${value}`);
                const ikv = {
                    handle: taskArgs.to,
                    key,
                    value,
                    version
                };
                await contract.ikvPut(ikv.handle, ikv.key, ikv.value, ikv.version);
            }
        }
    }


  });

