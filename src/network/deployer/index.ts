import '@nomiclabs/hardhat-ethers';
import path from 'path';
import hre from 'hardhat';
import ethereum from '../providers/ethereum';
import {uploadFile} from '../../client/storage';
import logger from '../../core/log';
import BN from 'bn.js';
import {Artifact} from 'hardhat/types';
import os from 'os';
import fs from 'fs-extra';
import axios from 'axios';
import tar from 'tar-fs';
import gunzip from 'gunzip-maybe';
import {deployProxy} from './deployProxy';
import {resolveHome} from '../../util';
import config from 'config';
const log = logger.child({module: 'Deployer_new'});

const IS_PACKAGED = Boolean((process as typeof process & {pkg?: unknown}).pkg);
const PROXY_METADATA_KEY = 'zweb/contracts/proxy/metadata';

// TODO: this is a temporary solution, supporting only limited number of dependencies
const NPM_DEPS_URLS: Record<string, string> = {
    '@openzeppelin/contracts': 'https://registry.npmjs.org/@openzeppelin/contracts/-/contracts-4.7.3.tgz',
    '@openzeppelin/contracts-upgradeable': 'https://registry.npmjs.org/@openzeppelin/contracts-upgradeable/-/contracts-upgradeable-4.7.3.tgz'
};

const downloadNpmDependency = (dependency: string) => new Promise<void>(async (resolve, reject) => {
    try {
        log.debug({dependency}, 'Downloading npm dependency');
        const depsPath = path.join(os.homedir(), '.point', 'hardhat', 'node_modules');
        if (!fs.existsSync(depsPath)) {
            await fs.mkdirp(depsPath);
        }
        
        if (fs.existsSync(path.join(depsPath, dependency))) {
            log.debug({dependency}, 'NPM dependency already exists, skipping');
            resolve();
        }

        const res = await axios.get(NPM_DEPS_URLS[dependency], {responseType: 'stream'});

        const stream = res.data
            .pipe(gunzip())
            .pipe(tar.extract(path.join(depsPath, `${dependency}_tmp`)));

        stream.on('finish', async () => {
            try {
                if (dependency.split('/').length > 1) {
                    await fs.mkdirp(path.join(depsPath, ...dependency.split('/').slice(0, -1)));
                }
                await fs.rename(
                    path.join(depsPath, `${dependency}_tmp`, 'package'),
                    path.join(depsPath, dependency)
                );
                await fs.rm(path.join(depsPath, `${dependency}_tmp`), {recursive: true, force: true});
                log.debug({dependency}, 'Downloaded npm dependency successfully');
                resolve();
            } catch (e) {
                reject(e);
            }
        });

        stream.on('error', (e: Error) => {
            reject(e);
        });
    } catch (e) {
        reject(e);
    }
});

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
    // TODO: move it to config
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
        resolveHome(config.get('datadir')),
        '.openzeppelin'
    );
    if (!fs.existsSync(openzeppelinPath)) {
        await fs.mkdirp(openzeppelinPath);
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
    forceDeployProxy = false,
    dependencies = []
}: {
    contracts: {
        file: Buffer
        name: string
    }[],
    version: string,
    target: string,
    forceDeployProxy?: boolean,
    dependencies?: string[]
}) => {
    const proxyMetadataFilePath = await getProxyMetadataFilePath();
    const identity = target.replace(/.point$/, '');
    const hardhatContractsDir = IS_PACKAGED
        ? path.join(os.homedir(), '.point', 'hardhat', 'contracts')
        : path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'hardhat',
            'contracts'
        );
    if (!fs.existsSync(hardhatContractsDir)) {
        await fs.mkdirp(hardhatContractsDir);
    }

    await Promise.all(contracts.map(async contract => {
        await fs.writeFile(
            path.join(hardhatContractsDir, `${contract.name}.sol`),
            contract.file
        );
    }));

    if (IS_PACKAGED) {
        await Promise.all(dependencies.map(async dep => {await downloadNpmDependency(dep);}));
    }

    await hre.run('compile');

    await Promise.all(contracts.map(async contract => {
        await fs.unlink(path.join(hardhatContractsDir, `${contract.name}.sol`));

        const proxyAddress = await ethereum.getKeyValue(
            target,
            'zweb/contracts/address/' + contract.name
        );

        const proxyDescriptionFileId = await ethereum.getKeyValue(
            target,
            PROXY_METADATA_KEY
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
                proxy = await deployProxy(
                    hre,
                    contractF,
                    [idContract.options.address, identity]
                );
            } catch (e) {
                log.warn(
                    'Deploying proxy binded with id contract and identity failed.'
                );
                log.debug(
                    {IdContractAddress: idContract.options.address, identity},
                    'deployProxy call without parameters. Only the owner will be able to upgrade the proxy.'
                );
                proxy = await deployProxy(hre, contractF, []);
            }
        } else {
            // TODO: this is not used yet, but should be implemented
            // in theory, we should only uncomment and replace upgradeProxy and forceImport
            // functions so that take data from manifest from the modified path
            throw new Error('Upgrade proxy not implemented yet');
            // log.debug('upgradeProxy call');
            // await fs.writeFile(
            //     proxyMetadataFilePath,
            //     await getFile(proxyDescriptionFileId)
            // );
            //
            // try {
            //     proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
            // } catch (e) {
            //     log.debug('upgradeProxy call failed');
            //     log.debug('deleting proxy metadata file');
            //     await fs.unlink(proxyMetadataFilePath);
            //     log.debug('calling forceImport');
            //     await hre.upgrades.forceImport(proxyAddress, contractF, {kind: 'uups'});
            //     log.debug({proxyAddress}, 'upgradeProxy call after forceImport');
            //     proxy = await hre.upgrades.upgradeProxy(proxyAddress, contractF);
            // }
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
