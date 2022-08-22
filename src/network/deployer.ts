import '@nomiclabs/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import path from 'path';
import {existsSync, promises as fs} from 'fs';
import hre from 'hardhat';
import ethereum from './providers/ethereum';
import {getFile, uploadFile} from '../client/storage';
import logger from '../core/log';
import BN from 'bn.js';
import {Artifact} from 'hardhat/types';
const log = logger.child({module: 'Deployer'});

const PROXY_METADATA_KEY = 'zweb/contracts/proxy/metadata';

const storeContractArtifacts = async ({
    artifacts,
    contractName,
    version,
    address,
    target
}: {
    artifacts: Artifact,
    contractName: string,
    version: string,
    address: string,
    target: string
}) => {
    const artifactsJSON = JSON.stringify(artifacts);

    const artifactsStorageId = await uploadFile(artifactsJSON);

    await ethereum.putKeyValue(
        target,
        'zweb/contracts/address/' + contractName,
        address,
        version
    );
    await ethereum.putKeyValue(
        target,
        'zweb/contracts/abi/' + contractName,
        artifactsStorageId,
        version
    );

    return artifactsStorageId;
};

const getProxyMetadataFilePath = async () => {
    const networkNames: Record<number, string> = {
        1: 'mainnet',
        2: 'morden',
        3: 'ropsten',
        4: 'rinkeby',
        5: 'goerli',
        42: 'kovan'
    };

    const chainId = new BN(
        (await hre.ethers.provider.send('eth_chainId', [])).replace(/^0x/, ''), 'hex'
    ).toNumber();

    const name = networkNames[chainId] ?? `unknown-${chainId}`;
    const openzeppelinPath = path.resolve(
        __dirname,
        '..',
        '..',
        '.openzeppelin'
    );
    if (!existsSync(openzeppelinPath)) {
        await fs.mkdir(openzeppelinPath);
    }
    return path.join(
        openzeppelinPath,
        `${name}.json`
    );
};

export const deployUpgradableContracts = async ({
    contracts,
    version,
    target,
    forceDeployProxy = false
}: {
    contracts: {
        file: Buffer
        name: string
    }[],
    version: string,
    target: string,
    forceDeployProxy?: boolean
}) => {
    const proxyMetadataFilePath = await getProxyMetadataFilePath();
    const identity = target.replace(/.point$/, '');
    const hardhatContractsDir = path.resolve(
        __dirname,
        '..',
        '..',
        'hardhat',
        'contracts'
    );

    await Promise.all(contracts.map(async contract => {
        await fs.writeFile(
            path.join(hardhatContractsDir, `${contract.name}.sol`),
            contract.file
        );
    }));

    await hre.run('compile');

    await Promise.all(contracts.map(async contract => {
        await fs.unlink(path.join(hardhatContractsDir, `${contract.name}.sol`));

        const proxyAddress = await ethereum.getKeyValue(
            target,
            'zweb/contracts/address/' + contract.name,
            version,
            'equalOrBefore'
        );

        const proxyDescriptionFileId = await ethereum.getKeyValue(
            target,
            PROXY_METADATA_KEY,
            version,
            'equalOrBefore'
        );

        let proxy;
        const contractF = await hre.ethers.getContractFactory(contract.name);
        if (!proxyAddress || !proxyDescriptionFileId || forceDeployProxy) {
            log.debug('deployProxy call');
            const idContract = await ethereum.loadIdentityContract();
            log.debug(
                {address: idContract.options.address},
                'Identity contract address'
            );
            try {
                log.debug(
                    {IdContractAddress: idContract.options.address, identity},
                    'deploying proxy binded with identity contract and identity'
                );
                proxy = await hre.upgrades.deployProxy(
                    contractF,
                    [idContract.options.address, identity],
                    {kind: 'uups'}
                );
            } catch (e) {
                log.warn(
                    'Deploying proxy binded with id contract and identity failed.'
                );
                log.debug(
                    {IdContractAddress: idContract.options.address, identity},
                    'deployProxy call without parameters. Only the owner will be able to upgrade the proxy.'
                );
                proxy = await hre.upgrades.deployProxy(contractF, [], {kind: 'uups'});
            }
        } else {
            log.debug('upgradeProxy call');
            await fs.writeFile(
                proxyMetadataFilePath,
                await getFile(proxyDescriptionFileId)
            );

            try {
                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
            } catch (e) {
                log.debug('upgradeProxy call failed');
                log.debug('deleting proxy metadata file');
                await fs.unlink(proxyMetadataFilePath);
                log.debug('calling forceImport');
                await hre.upgrades.forceImport(proxyAddress, contractF, {kind: 'uups'});
                log.debug({proxyAddress}, 'upgradeProxy call after forceImport');
                proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
            }
        }
        await proxy.deployed();
        const address = proxy.address;

        const artifactsDeployed = await hre.artifacts.readArtifact(contract.name);

        const artifactsStorageId = await storeContractArtifacts({
            artifacts: artifactsDeployed,
            contractName: contract.name,
            version,
            address,
            target
        });

        log.debug(
            `Contract ${contract.name} with Artifacts Storage ID ${artifactsStorageId} is deployed to ${address}`
        );
    }));

    const proxyMetadataFile = await fs.readFile(proxyMetadataFilePath, 'utf-8');
    const proxyMetadata = JSON.parse(proxyMetadataFile);

    log.debug({proxyMetadata}, 'Uploading proxy metadata file...');
    const proxyMetadataFileUploadedId = await uploadFile(JSON.stringify(proxyMetadata));
    log.debug({target, proxyMetadataFileUploadedId}, 'Updating Proxy Metadata');
    await ethereum.putKeyValue(
        target,
        PROXY_METADATA_KEY,
        proxyMetadataFileUploadedId,
        version
    );
    log.debug('Proxy metadata updated');
};
