import { task } from "hardhat/config";
import fs = require('fs');
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import type { ContractFactory } from 'ethers'; 


task("deploy-upgradable", "Deploy Upgradable Contract")
.addParam("contractList", "List of comma separeted contracts that will be deployed")
.setAction(async (taskArgs, hre) => {
  
  console.log("Deploying upgradable for contracts: " + taskArgs.contractList);
  
  const contracts = taskArgs.contractList.split(',');
  for(const contract of contracts){
    let contractName = contract.split('/').pop().replace('.sol', '');
    
    //TODO: Deploy first time, upgrade next ones.
    let contractF = await hre.ethers.getContractFactory(contractName);
    let proxy = await hre.upgrades.deployProxy(contractF as ContractFactory, [], { kind: 'uups' });
    await proxy.deployed();
    console.log(proxy.address);

  }
  
});
