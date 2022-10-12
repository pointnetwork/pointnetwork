import {
    assertStorageUpgradeSafe,
    assertUpgradeSafe,
    getImplementationAddress,
    getStorageLayout,
    getStorageLayoutForAddress,
    getUnlinkedBytecode,
    getVersion,
    processProxyKind,
    StorageLayout,
    ValidationDataCurrent,
    ValidationOptions,
    Version
} from '@openzeppelin/upgrades-core';
import {
    deploy,
    readValidations,
    Options,
    UpgradeProxyOptions,
    withDefaults
} from '@openzeppelin/hardhat-upgrades/dist/utils';
import type {ContractFactory} from 'ethers';
import {FormatTypes} from 'ethers/lib/utils';
import type {EthereumProvider, HardhatRuntimeEnvironment} from 'hardhat/types';
import {Manifest} from './manifest';
import {fetchOrDeploy} from './fetchOrDeploy';

// Copied from @openzeppeling/hardhat-upgrades and modified to add ability to change
// the location of .openzeppelin folder
interface DeployedProxyImpl {
    impl: string;
    kind: NonNullable<ValidationOptions['kind']>;
}

interface DeployData {
    provider: EthereumProvider;
    validations: ValidationDataCurrent;
    unlinkedBytecode: string;
    encodedArgs: string;
    version: Version;
    layout: StorageLayout;
    fullOpts: Required<Options>;
}

export async function deployProxyImpl(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
    opts: Options,
    proxyAddress?: string
): Promise<DeployedProxyImpl> {
    const deployData = await getDeployData(hre, ImplFactory, opts);

    await processProxyKind(deployData.provider, proxyAddress, opts, deployData.validations, deployData.version);

    let currentImplAddress: string | undefined;
    if (proxyAddress !== undefined) {
        // upgrade scenario
        currentImplAddress = await getImplementationAddress(deployData.provider, proxyAddress);
    }

    return deployImpl(deployData, ImplFactory, opts, currentImplAddress);
}

async function getDeployData(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
    opts: Options
): Promise<DeployData> {
    const {provider} = hre.network;
    const validations = await readValidations(hre);
    const unlinkedBytecode = getUnlinkedBytecode(validations, ImplFactory.bytecode);
    const encodedArgs = ImplFactory.interface.encodeDeploy(opts.constructorArgs);
    const version = getVersion(unlinkedBytecode, ImplFactory.bytecode, encodedArgs);
    const layout = getStorageLayout(validations, version);
    const fullOpts = withDefaults(opts);
    return {provider, validations, unlinkedBytecode, encodedArgs, version, layout, fullOpts};
}

async function deployImpl(
    deployData: DeployData,
    ImplFactory: ContractFactory,
    opts: UpgradeProxyOptions,
    currentImplAddress?: string
): Promise<any> {
    assertUpgradeSafe(deployData.validations, deployData.version, deployData.fullOpts);

    const layout = deployData.layout;

    if (currentImplAddress !== undefined) {
        const manifest = await Manifest.forNetwork(deployData.provider);
        const currentLayout = await getStorageLayoutForAddress(
            // @ts-expect-error IDK, different class properties
            manifest,
            deployData.validations,
            currentImplAddress
        );
        if (opts.unsafeSkipStorageCheck !== true) {
            assertStorageUpgradeSafe(currentLayout, deployData.layout, deployData.fullOpts);
        }
    }

    const impl = await fetchOrDeploy(
        deployData.version,
        deployData.provider,
        async () => {
            const abi = ImplFactory.interface.format(FormatTypes.minimal) as string[];
            const deployment = Object.assign({abi}, await deploy(ImplFactory, ...deployData.fullOpts.constructorArgs));
            return {...deployment, layout};
        },
        opts
    );

    return {impl, kind: opts.kind};
}
