import debug from '@openzeppelin/hardhat-upgrades/dist/utils/debug';
import {Manifest, ManifestData, ImplDeployment} from './manifest';
import {
    DeployOpts,
    Version,
    EthereumProvider,
    isDevelopmentNetwork,
    Deployment,
    InvalidDeployment,
    resumeOrDeploy,
    waitAndValidateDeployment
} from '@openzeppelin/upgrades-core';
import assert from 'assert';

// Copied from @openzeppeling/hardhat-upgrades and modified to add ability to change
// the location of .openzeppelin folder
interface ManifestLens<T> {
    description: string;
    type: string;
    (data: ManifestData): ManifestField<T>;
}

interface ManifestField<T> {
    get(): T | undefined;
    set(value: T | undefined): void;
    merge?(value: T | undefined): void;
}

export async function fetchOrDeploy(
    version: Version,
    provider: EthereumProvider,
    deploy: () => Promise<ImplDeployment>,
    opts?: DeployOpts,
    merge?: boolean
): Promise<string> {
    return (await fetchOrDeployGeneric(
        implLens(version.linkedWithoutMetadata), provider, deploy, opts, merge
    )).address;
}

async function fetchOrDeployGeneric<T extends Deployment, U extends T = T>(
    lens: ManifestLens<T>,
    provider: EthereumProvider,
    deploy: () => Promise<U>,
    opts?: DeployOpts,
    merge?: boolean
): Promise<U | Deployment> {
    const manifest = await Manifest.forNetwork(provider);

    try {
        const deployment = await manifest.lockedRun(async () => {
            debug('fetching deployment of', lens.description);
            const data = await manifest.read();
            const deployment = lens(data);
            if (merge && !deployment.merge) {
                throw new Error(
                    'fetchOrDeployGeneric was called with merge set to true but the deployment lens does not have a merge function'
                );
            }

            const stored = deployment.get();
            const updated = await resumeOrDeploy(
                provider,
                stored,
                deploy,
                lens.type,
                opts,
                deployment,
                merge
            );
            if (updated !== stored) {
                if (merge && deployment.merge) {
                    // only check primary addresses for clashes, since the address could already exist in an allAddresses field
                    // but the above updated and stored objects are different instances representing the same entry
                    await checkForAddressClash(provider, data, updated, false);
                    deployment.merge(updated);
                } else {
                    await checkForAddressClash(provider, data, updated, true);
                    deployment.set(updated);
                }
                await manifest.write(data);
            }
            return updated;
        });

        await waitAndValidateDeployment(provider, deployment, lens.type, opts);

        return deployment;
    } catch (e) {
        // If we run into a deployment error, we remove it from the manifest.
        if (e instanceof InvalidDeployment) {
            await manifest.lockedRun(async () => {
                assert(e instanceof InvalidDeployment); // Not sure why this is needed but otherwise doesn't type
                const data = await manifest.read();
                const deployment = lens(data);
                const stored = deployment.get();
                if (stored?.txHash === e.deployment.txHash) {
                    deployment.set(undefined);
                    await manifest.write(data);
                }
            });
            e.removed = true;
        }

        throw e;
    }
}

const implLens = (versionWithoutMetadata: string) =>
    lens(`implementation ${versionWithoutMetadata}`, 'implementation', data => ({
        get: () => data.impls[versionWithoutMetadata],
        set: (value?: ImplDeployment) => (data.impls[versionWithoutMetadata] = value),
        merge: (value?: ImplDeployment) => {
            const existing = data.impls[versionWithoutMetadata];
            if (existing !== undefined && value !== undefined) {
                const {address, allAddresses} = mergeAddresses(existing, value);
                data.impls[versionWithoutMetadata] = {...existing, address, allAddresses};
            } else {
                data.impls[versionWithoutMetadata] = value;
            }
        }
    }));

function lens<T>(
    description: string,
    type: string,
    fn: (data: ManifestData) => ManifestField<T>
): ManifestLens<T> {
    return Object.assign(fn, {description, type});
}

function mergeAddresses(existing: ImplDeployment, value: ImplDeployment) {
    const merged = new Set<string>();

    merged.add(existing.address);
    merged.add(value.address);

    existing.allAddresses?.forEach(item => merged.add(item));
    value.allAddresses?.forEach(item => merged.add(item));

    return {address: existing.address, allAddresses: Array.from(merged)};
}

async function checkForAddressClash(
    provider: EthereumProvider,
    data: ManifestData,
    updated: Deployment,
    checkAllAddresses: boolean
): Promise<void> {
    const clash = lookupDeployment(data, updated.address, checkAllAddresses);
    if (clash !== undefined) {
        if (await isDevelopmentNetwork(provider)) {
            debug('deleting a previous deployment at address', updated.address);
            clash.set(undefined);
        } else {
            throw new Error(
                `The following deployment clashes with an existing one at ${updated.address}\n\n` +
                JSON.stringify(updated, null, 2) +
                `\n\n`
            );
        }
    }
}

function lookupDeployment(
    data: ManifestData,
    address: string,
    checkAllAddresses: boolean
): ManifestField<Deployment> | undefined {
    if (data.admin?.address === address) {
        return adminLens(data);
    }

    for (const versionWithoutMetadata in data.impls) {
        if (
            data.impls[versionWithoutMetadata]?.address === address ||
            (
                checkAllAddresses &&
                data.impls[versionWithoutMetadata]?.allAddresses?.includes(address)
            )
        ) {
            return implLens(versionWithoutMetadata)(data);
        }
    }
}

const adminLens = lens('proxy admin', 'proxy admin', data => ({
    get: () => data.admin,
    set: (value?: Deployment) => (data.admin = value)
}));

export async function fetchOrDeployAdmin(
    provider: EthereumProvider,
    deploy: () => Promise<Deployment>,
    opts?: DeployOpts
): Promise<string> {
    return (await fetchOrDeployGeneric(adminLens, provider, deploy, opts)).address;
}
