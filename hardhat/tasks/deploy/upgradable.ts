import { task } from "hardhat/config";
import fs = require('fs');
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import type { ContractFactory } from 'ethers'; 


task("deploy-upgradable", "Deploy Upgradable Contract")
.addParam("zapp", "Path to the ZApp that will be deployed")
.setAction(async (taskArgs, hre) => {
  
  let proxyAddresses = '';

  //TODO: Adjust for correct address in YNet
  //1. get the address of identity contract
  let identityContractAddress = require('/app/hardhat/Identity-address.json').address;

  const identity = await hre.ethers.getContractAt("Identity", identityContractAddress);
  const zappName = taskArgs.zapp.split('/').pop().replace('.z','');

  console.log(await hre.ethers.provider.getCode(identityContractAddress));

  //TODO: Change paths for deploy from deployspace?
  //TODO: Adjust the path for other OS
  let deployConf = require('/app/' + taskArgs.zapp + '/point.deploy.json')

  //TODO: Restore .openzepelling files if not exists in local folder if does not exists.

  let i = 0;
  for(const contract of deployConf.contracts){
    let contractName = contract.split('/').pop().replace('.sol', '');
    //2. consult identity contract to get the proxy address using name pattern <Contract>Proxy.
    let proxyAddr = '';
    proxyAddr = await identity.ikvGet(zappName, contractName + "Proxy");

    //3. Decide if upgrades or deploy a proxy
    if (proxyAddr == ''){
      let contractF = await hre.ethers.getContractFactory(contractName);
      let proxy = await hre.upgrades.deployProxy(contractF as ContractFactory, [], { kind: 'uups' });
      await proxy.deployed();
      proxyAddresses += `${contractName + "Proxy"}:${proxy.address}${(i != deployConf.contracts.length -1) ? ',' : ''}`;

      //TODO:Resolve versioning number
      //TODO:Send from the right address.
      //await identity.ikvPut(zappName, contractName + "Proxy", proxyAddresses, deployConf.version.toString() + '.0');
    }else{
      //TODO:upgrade the proxy
      console.log('upgrade!!!!!!!!!!!!!!!!');
    }
  
  }

  //6.Pass the .openzeppeling json file to point upload to arweave.

  //output the proxy contracts addresses
  console.log(proxyAddresses);

  //second output is the hardhat/.openzeppeling/unkown-<chainId>.json file
  //which cointains the addresses of the contracts deployed
  
});
