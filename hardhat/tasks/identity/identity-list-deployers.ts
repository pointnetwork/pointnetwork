import { task } from "hardhat/config";

//npx hardhat complie
//npx hardhat identity-list-deployers 0xD61e5eFcB183418E1f6e53D0605eed8167F90D4d sms --network development

task("identity-list-deployers", "Will list the active deployers of an identity")
  .addPositionalParam("address","Identity contract source address")
  .addPositionalParam("identity", "Identity to add the deployer")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;

    if(!ethers.utils.isAddress(taskArgs.address)) {
        console.log('Address of the identity contract not valid.');
        return false;
    }
    const contractF = await hre.ethers.getContractFactory("Identity");
    const identityContract = await contractF.attach(taskArgs.address);
    let identityDeployerChangedFilter = identityContract.filters.IdentityDeployerChanged()
    let identityDeployerChangedEvents = await identityContract.queryFilter(identityDeployerChangedFilter);

    let deployers = [];
    let skipList: string[] = [];
    identityDeployerChangedEvents = identityDeployerChangedEvents.reverse();
    for(const e of identityDeployerChangedEvents){
        if(e.args) {
            const {identity, deployer, allowed} = e.args;
            if(identity === taskArgs.identity){
                if (allowed == true){
                    if(skipList.includes(deployer)){
                        continue;
                    }else{
                        deployers.push(deployer);
                        skipList.push(deployer);
                    }
                }else{
                    if(!skipList.includes(deployer)){
                        skipList.push(deployer);
                    }
                }
            }
        }
    }

    console.log(deployers);
  });

