import type {EthereumProvider} from 'hardhat/types';
import {
    ValidationOptions,
    Version,
    ValidationData,
    isBeaconProxy,
    inferProxyKind,
    BeaconProxyUnsupportedError,
    ProxyDeployment
} from '@openzeppelin/upgrades-core';
import {DeploymentNotFound, Manifest} from './manifest';

export async function processProxyKind(
    provider: EthereumProvider,
    proxyAddress: string | undefined,
    opts: ValidationOptions,
    data: ValidationData,
    version: Version
) {
    if (opts.kind === undefined) {
        if (proxyAddress !== undefined && (await isBeaconProxy(provider, proxyAddress))) {
            opts.kind = 'beacon';
        } else {
            opts.kind = inferProxyKind(data, version);
        }
    }

    if (proxyAddress !== undefined) {
        await setProxyKind(provider, proxyAddress, opts);
    }

    if (opts.kind === 'beacon') {
        throw new BeaconProxyUnsupportedError();
    }
}

async function setProxyKind(
    provider: EthereumProvider,
    proxyAddress: string,
    opts: ValidationOptions
): Promise<ProxyDeployment['kind']> {
    const manifest = await Manifest.forNetwork(provider);

    const manifestDeployment = await manifest.getProxyFromAddress(proxyAddress).catch(e => {
        if (e instanceof DeploymentNotFound) {
            return undefined;
        } else {
            throw e;
        }
    });

    if (opts.kind === undefined) {
        opts.kind = manifestDeployment?.kind ?? 'transparent';
    } else if (manifestDeployment && opts.kind !== manifestDeployment.kind) {
        throw new Error(`Requested an upgrade of kind ${opts.kind} but proxy is ${manifestDeployment.kind}`);
    }

    return opts.kind;
}
