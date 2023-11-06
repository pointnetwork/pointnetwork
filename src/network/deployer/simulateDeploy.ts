import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {ContractFactory} from 'ethers';
import {UpgradeOptions} from '@openzeppelin/hardhat-upgrades/dist/utils/index';
import {fetchOrDeploy, fetchOrDeployAdmin} from './fetchOrDeploy';
import {getDeployData} from './deployProxyImpl';
import {FormatTypes} from 'ethers/lib/utils';
import {logWarning} from '@openzeppelin/upgrades-core';

export async function simulateDeployImpl(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions,
    implAddress: string
) {
    const {deployData, simulateDeploy} = await getSimulatedData(
        hre,
        ImplFactory,
        opts,
        implAddress
    );
    await fetchOrDeploy(deployData.version, deployData.provider, simulateDeploy, opts, true);
}

async function getSimulatedData(
    hre: HardhatRuntimeEnvironment,
    ImplFactory: ContractFactory,
    opts: UpgradeOptions,
    implAddress: string
) {
    const deployData = await getDeployData(hre, ImplFactory, opts);
    const simulateDeploy = async () => ({
        abi: ImplFactory.interface.format(FormatTypes.minimal) as string[],
        layout: deployData.layout,
        address: implAddress
    });
    return {deployData, simulateDeploy};
}

export async function simulateDeployAdmin(
    hre: HardhatRuntimeEnvironment,
    ProxyAdminFactory: ContractFactory,
    opts: UpgradeOptions,
    adminAddress: string
) {
    const {deployData, simulateDeploy} = await getSimulatedData(
        hre,
        ProxyAdminFactory,
        opts,
        adminAddress
    );
    const manifestAdminAddress = await fetchOrDeployAdmin(
        deployData.provider,
        simulateDeploy,
        opts
    );
    if (adminAddress !== manifestAdminAddress) {
        logWarning(
            `Imported proxy with admin at '${adminAddress}' which differs from previously deployed admin '${manifestAdminAddress}'`,
            [
                `The imported proxy admin is different from the proxy admin that was previously deployed on this network. This proxy will not be upgradable directly by the plugin.`,
                `To upgrade this proxy, use the prepareUpgrade or defender.proposeUpgrade function and then upgrade it using the admin at '${adminAddress}'.`
            ]
        );
    }
}
