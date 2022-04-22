import { task } from "hardhat/config";
import fs = require('fs');
import {getProxyMetadataFilePath} from '../../utils';

//npx hardhat complie
//npx hardhat identity-remove-deployer 0xD61e5eFcB183418E1f6e53D0605eed8167F90D4d sms 0x1cDfC3B4112B5077721014A514748e7EDCA920AD 0x916f8E7566Dd63D7c444468CaDeA37e80f7F8048 --network development

task("identity-remove-deployer", "Will remove a deployer to an identity")
  .addPositionalParam("address","Identity contract source address")
  .addPositionalParam("identity", "Identity to remove the deployer")
  .addPositionalParam("deployer", "Address of the deployer to be removed")
  .addPositionalParam("owner", "Address of the owner of the identity")
  .setAction(async (taskArgs, hre) => {
    const ethers = hre.ethers;

    if(!ethers.utils.isAddress(taskArgs.address)) {
        console.log('Address of the identity contract not valid.');
        return false;
    }

    if(!ethers.utils.isAddress(taskArgs.deployer)) {
        console.log('Address of the deployer is not valid.');
        return false;
    }

    if(!ethers.utils.isAddress(taskArgs.owner)) {
        console.log('Address of the owner is not valid.');
        return false;
    }
    let signers = await ethers.getSigners()
    let owner = null;
    for(const signer of signers){
        if(signer.address === taskArgs.owner){
            owner = signer;
        }
    }
    if(owner === null){
        throw new Error('Owner not found. Did you addedd the private key of the owner in hardhat config file?');
    }

    const contractF = await hre.ethers.getContractFactory("Identity");
    const identityContract = await contractF.attach(taskArgs.address);

    try{
        await identityContract.connect(owner).removeIdentityDeployer(taskArgs.identity, taskArgs.deployer);
    }catch (e){
        console.log('error while removing identity deployer');
        throw e;
    }
    console.log('Deployer removed from the identity');
  });

