/* eslint-disable no-console */
import path from 'path';
import {readFile} from 'fs/promises';
import {get, post} from 'axios';
import {delay, getContractAddress} from '../../src/util';
import HttpsAgent from 'https-proxy-agent';
import {TIMEOUTS} from '../timeouts';

const DOCKER_POINT_NODE = 'point_node';
const POINT_NODE = process.env.TEST_POINT_NODE || DOCKER_POINT_NODE;

const httpAgentCfg = {
    host: POINT_NODE,
    port: 8666,
    protocol: 'http'
};
const httpsAgent = new HttpsAgent(httpAgentCfg);

const testData = {address: '', commPublicKey: '', deployConfig: null};
let blockchain;
let storage;

beforeAll(async () => {
    const identityContractAddress = getContractAddress('Identity');

    if (!identityContractAddress) {
        throw new Error('Could not get Identity contract address');
    }

    jest.resetModules();
    process.env.IDENTITY_CONTRACT_ADDRESS = identityContractAddress;

    // This hack with require is needed to patch env var before importing config
    const {getNetworkPublicKey, getNetworkAddress} = require('../../src/wallet/keystore');
    blockchain = require('../../src/network/providers/ethereum');
    storage = require('../../src/client/storage');

    testData.address = getNetworkAddress();
    testData.commPublicKey = getNetworkPublicKey();
    const filePath = path.join(
        __dirname,
        '..',
        'resources',
        'ynet_sample_site',
        'point.deploy.json'
    );
    const deployConfigFile = await readFile(filePath, 'utf-8');
    testData.deployConfig = JSON.parse(deployConfigFile);
});

describe('Register identity and deploy site', () => {
    const hexRegExp = /^[0-9A-Fa-f]{16,}$/;
    const addressRegExp = /^0x[a-fA-F0-9]{40}$/;
    let publicDirStorageId;
    let routesStorageId;

    it(
        'Should register a new identity',
        async () => {
            expect.assertions(5);

            const {target} = testData.deployConfig;
            const identity = target.replace(/\.point$/, '');

            const result = await blockchain.registerIdentity(
                identity,
                testData.address,
                Buffer.from(testData.commPublicKey, 'hex')
            );

            expect(result.events.IdentityRegistered).toBeTruthy();
            expect(result.from).toEqual(testData.address);
            expect(result.blockNumber).toBeGreaterThan(0);
            expect(result.gasUsed).toBeGreaterThan(0);
            expect(result.status).toBe(true);
        },
        TIMEOUTS.SM
    );

    it(
        'Should deploy the sample site to arweave',
        async () => {
            expect.assertions(1);
            const start = Date.now();
            const publicDir = path.join(__dirname, '..', 'resources', 'ynet_sample_site', 'public');
            const uploadDirStart = Date.now();
            publicDirStorageId = await storage.uploadDir(publicDir, true);
            const uploadDirEnd = Date.now();
            console.log(
                `uploadDir took: ${Math.round((uploadDirEnd - uploadDirStart) / 1000)}secs`
            );
            const {target, version} = testData.deployConfig;
            const putKVStart = Date.now();
            await blockchain.putKeyValue(target, '::rootDir', publicDirStorageId, version);
            const putKVEnd = Date.now();
            console.log(`putKeyValue took: ${Math.round((putKVEnd - putKVStart) / 1000)}secs`);
            expect(publicDirStorageId).toMatch(hexRegExp);
            const end = Date.now();
            const totalTime = Math.round((end - start) / 1000);
            console.log(`Total time to "deploy sample site": ${totalTime}secs`);
        },
        TIMEOUTS.XL
    );

    it(
        'Should add route to `routes.json` and deploy it',
        async () => {
            expect.assertions(1);
            const routesPath = path.join(
                __dirname,
                '..',
                'resources',
                'ynet_sample_site',
                'routes.json'
            );
            const routesStr = await readFile(routesPath, 'utf-8');
            const routesObj = JSON.parse(routesStr);
            const newRoute = `/${publicDirStorageId}`;
            routesObj[newRoute] = 'index.html';
            const routesFileAsBuffer = Buffer.from(JSON.stringify(routesObj, null, 2));
            routesStorageId = await storage.uploadFile(routesFileAsBuffer);
            expect(routesStorageId).toMatch(hexRegExp);
        },
        TIMEOUTS.XL
    );

    it(
        'Should add routes to "key-value storage"',
        async () => {
            expect.assertions(1);
            const {target, version} = testData.deployConfig;
            const res = await blockchain.putZRecord(target, `0x${routesStorageId}`, version);
            expect(res).toBe(undefined);
        },
        TIMEOUTS.LG
    );

    it(
        'Should deploy a contract',
        async () => {
            expect.assertions(1);

            const artifacts = JSON.parse(
                await readFile(
                    path.join(
                        __dirname,
                        '..',
                        'resources',
                        'ynet_sample_site',
                        'contracts',
                        'Why.json'
                    ),
                    'utf8'
                )
            ).contracts['Why.sol'].Why;
            const contract = blockchain.getContractFromAbi(artifacts.abi);
            const address = await blockchain.deployContract(contract, artifacts, 'Why');

            const artifactsStorageId = await storage.uploadFile(JSON.stringify(artifacts));

            const {target} = testData.deployConfig;
            await blockchain.putKeyValue(target, 'zweb/contracts/address/Why', address, 'latest');
            await blockchain.putKeyValue(
                target,
                'zweb/contracts/abi/Why',
                artifactsStorageId,
                'latest'
            );

            expect(address).toMatch(addressRegExp);
        },
        TIMEOUTS.LG
    );

    it(
        'Should fetch index.html making a GET request to the new domain',
        async () => {
            expect.assertions(3);
            await delay(5000);

            const res = await get(`https://${testData.deployConfig.target}`, {httpsAgent});

            expect(res.status).toEqual(200);
            expect(res.data).toMatch(/^<!DOCTYPE html>/);
            expect(res.data).toMatch('<title>E2E Test Site</title>');
        },
        TIMEOUTS.XL
    );

    it(
        'Should fetch a file in the root folder',
        async () => {
            expect.assertions(2);

            await delay(5000);
            const url = `https://${testData.deployConfig.target}/index.css`;
            const res = await get(url, {httpsAgent});
            expect(res.status).toEqual(200);
            expect(res.data).toMatch(/^h1 {/);
        },
        TIMEOUTS.MD
    );

    it(
        'Should return a file in a nested folder',
        async () => {
            expect.assertions(2);

            await delay(5000);
            const url = `https://${testData.deployConfig.target}/images/sample.jpg`;
            const res = await get(url, {httpsAgent});
            expect(res.status).toEqual(200);
            expect(res.headers['content-type']).toEqual('image/jpeg');
        },
        TIMEOUTS.MD
    );
});

describe('Proxy keyvalue', () => {
    // TODO: add test for storage upload
    it(
        'Should append keyvalue',
        async () => {
            expect.assertions(2);

            await delay(5000);
            const res = await post(
                `https://${testData.deployConfig.target}/_keyvalue_append/foo`,
                'foo=bar&baz=123',
                {httpsAgent}
            );

            expect(res.status).toEqual(200);
            expect(res.data).toEqual('Success');
        },
        TIMEOUTS.XS
    );

    it(
        'Should get keyvalue',
        async () => {
            expect.assertions(3);

            await delay(5000);
            const url = `https://${testData.deployConfig.target}/_keyvalue_get/foo0`;
            const res = await get(url, {httpsAgent});

            expect(res.status).toEqual(200);
            expect(res.data.foo).toEqual('bar');
            // TODO: this is the problem with x-www-form-urlencoded: numbers are not parsed correctly
            expect(res.data.baz).toEqual('123');
        },
        TIMEOUTS.XS
    );

    it(
        'Should return null for non-existing keyvalue',
        async () => {
            expect.assertions(2);

            const url = `https://${testData.deployConfig.target}/_keyvalue_get/notexists`;
            const res = await get(url, {httpsAgent});

            expect(res.status).toEqual(200);
            expect(res.data).toEqual(null);
        },
        TIMEOUTS.XS
    );
});

describe('Proxy contract send', () => {
    // TODO: add test for storage upload
    // TODO: contract send for point host seems not possible, bc host argument is passed incorrectly
    // is it a bug or is it intended?

    it(
        'Should store value in why contract',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const res = await post(
                `https://${testData.deployConfig.target}/_contract_send/Why.storeValue(value)`,
                'value=foo',
                {httpsAgent}
            );

            expect(res.status).toEqual(200);
        },
        TIMEOUTS.XS
    );

    // Function without args call
    // TODO: this is useless, returns nothing.
    it(
        'Should get values in why contract',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const res = await post(
                `https://${testData.deployConfig.target}/_contract_send/Why.getValues()`,
                '',
                {httpsAgent}
            );

            expect(res.status).toEqual(200);
        },
        TIMEOUTS.XS
    );

    // Function with args call
    // TODO: this is useless, returns nothing.
    it(
        'Should get stored value in why contract',
        async () => {
            expect.assertions(1);

            await delay(5000);
            const res = await post(
                `https://${testData.deployConfig.target}/_contract_send/Why.getValue(id)`,
                'id=0',
                {httpsAgent}
            );

            expect(res.status).toEqual(200);
        },
        TIMEOUTS.XS
    );
});
