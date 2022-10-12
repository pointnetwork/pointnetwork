import type {HardhatRuntimeEnvironment} from 'hardhat/types';
import type {ContractFactory} from 'ethers';
import {logWarning} from '@openzeppelin/upgrades-core';
import {
    deploy,
    getProxyFactory,
    getInitializerData
} from '@openzeppelin/hardhat-upgrades/dist/utils';
import {Manifest} from './manifest';
import {deployProxyImpl} from './deployProxyImpl';

// Copied from @openzeppeling/hardhat-upgrades and modified to add ability to change
// the location of .openzeppelin folder
// Also removed code for other than uups types of proxy
export async function deployProxy(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
    args: unknown[] = []
) {
    const {provider} = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const {impl, kind} = await deployProxyImpl(hre, ImplFactory, {kind: 'uups'});
    const contractInterface = ImplFactory.interface;
    const data = getInitializerData(contractInterface, args);

    if (await manifest.getAdmin()) {
        logWarning(`A proxy admin was previously deployed on this network`, [
            `This is not natively used with the current kind of proxy ('uups').`,
            `Changes to the admin will have no effect on this new proxy.`
        ]);
    }

    const ProxyFactory = await getProxyFactory(hre, ImplFactory.signer);
    const proxyDeployment = Object.assign({kind}, await deploy(ProxyFactory, impl, data));

    await manifest.addProxy(proxyDeployment);

    const inst = ImplFactory.attach(proxyDeployment.address);
    // @ts-expect-error Won't be readonly because inst was created through attach.
    inst.deployTransaction = proxyDeployment.deployTransaction;
    return inst;
}
