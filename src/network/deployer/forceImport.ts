import {
    ContractAddressOrInstance,
    getContractAddress,
    UpgradeOptions,
    getUpgradeableBeaconFactory
} from '@openzeppelin/hardhat-upgrades/dist/utils/index';
import {
    getImplementationAddressFromProxy,
    logWarning,
    ProxyDeployment,
    isBeacon,
    getImplementationAddressFromBeacon,
    ForceImportUnsupportedError,
    isBeaconProxy,
    inferProxyKind,
    getAdminAddress
} from '@openzeppelin/upgrades-core';
import {ContractFactory} from 'ethers';
import {EthereumProvider, HardhatRuntimeEnvironment} from 'hardhat/types';
import {Manifest} from './manifest';
import {simulateDeployAdmin, simulateDeployImpl} from './simulateDeploy';
import {getDeployData} from './deployProxyImpl';

export async function forceImport(
    hre: HardhatRuntimeEnvironment,
    proxyOrBeacon: ContractAddressOrInstance,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions = {}
) {
    const {provider} = hre.network;
    const manifest = await Manifest.forNetwork(provider);

    const proxyOrBeaconAddress = getContractAddress(proxyOrBeacon);

    const implAddress = await getImplementationAddressFromProxy(provider, proxyOrBeaconAddress);
    if (implAddress !== undefined) {
        await importProxyToManifest(
            provider,
            hre,
            proxyOrBeaconAddress,
            implAddress,
            ImplFactory,
            opts,
            manifest
        );

        return ImplFactory.attach(proxyOrBeaconAddress);
    } else if (await isBeacon(provider, proxyOrBeaconAddress)) {
        const beaconImplAddress = await getImplementationAddressFromBeacon(
            provider,
            proxyOrBeaconAddress
        );
        await addImplToManifest(hre, beaconImplAddress, ImplFactory, opts);

        const UpgradeableBeaconFactory = await getUpgradeableBeaconFactory(hre, ImplFactory.signer);
        return UpgradeableBeaconFactory.attach(proxyOrBeaconAddress);
    } else {
        throw new ForceImportUnsupportedError(proxyOrBeaconAddress);
    }
}

async function importProxyToManifest(
    provider: EthereumProvider,
    hre: HardhatRuntimeEnvironment,
    proxyAddress: string,
    implAddress: string,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions,
    manifest: Manifest
) {
    await addImplToManifest(hre, implAddress, ImplFactory, opts);

    let importKind: ProxyDeployment['kind'];
    if (opts.kind === undefined) {
        if (await isBeaconProxy(provider, proxyAddress)) {
            importKind = 'beacon';
        } else {
            const deployData = await getDeployData(hre, ImplFactory, opts);
            importKind = inferProxyKind(deployData.validations, deployData.version);
        }
    } else {
        importKind = opts.kind;
    }

    if (importKind === 'transparent') {
        await addAdminToManifest(provider, hre, proxyAddress, ImplFactory, opts);
    }
    await addProxyToManifest(importKind, proxyAddress, manifest);
}

async function addImplToManifest(
    hre: HardhatRuntimeEnvironment,
    implAddress: string,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions
) {
    await simulateDeployImpl(hre, ImplFactory, opts, implAddress);
}

async function addProxyToManifest(kind: ProxyDeployment['kind'], address: string, manifest: Manifest) {
    await manifest.addProxy({kind, address});

    if (kind !== 'transparent' && (await manifest.getAdmin())) {
        logWarning(`A proxy admin was previously deployed on this network`, [
            `This is not natively used with the current kind of proxy ('${kind}').`,
            `Changes to the admin will have no effect on this new proxy.`
        ]);
    }
}

async function addAdminToManifest(
    provider: EthereumProvider,
    hre: HardhatRuntimeEnvironment,
    proxyAddress: string,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions
) {
    const adminAddress = await getAdminAddress(provider, proxyAddress);
    await simulateDeployAdmin(hre, ImplFactory, opts, adminAddress);
}
