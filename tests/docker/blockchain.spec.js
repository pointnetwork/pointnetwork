import path from 'path';
import {readFile} from 'fs/promises';
import axios from 'axios';
import {delay} from '../../src/core/utils';
import {getContractAddress} from '../../src/util';
import HttpsAgent from 'https-proxy-agent';

jest.retryTimes(30);

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
    blockchain = require('../../src/network/blockchain');
    storage = require('../../src/client/storage');

    testData.address = getNetworkAddress();
    testData.commPublicKey = getNetworkPublicKey();
    const filePath = path.join(__dirname, '..', 'resources', 'sample_site', 'point.deploy.json');
    const deployConfigFile = await readFile(filePath, 'utf-8');
    testData.deployConfig = JSON.parse(deployConfigFile);
});

describe('Register identity and deploy site', () => {
    const hexRegExp = /^[0-9A-Fa-f]{16,}$/;
    let publicDirStorageId;
    let routesStorageId;

    it('Should register a new identity', async () => {
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
    }, 20000);

    it('Should deploy the sample site to arweave', async () => {
        expect.assertions(1);
        const publicDir = path.join(__dirname, '..', 'resources', 'sample_site', 'public');
        publicDirStorageId = await storage.uploadDir(publicDir);
        const {target, version} = testData.deployConfig;
        await blockchain.putKeyValue(target, '::rootDir', publicDirStorageId, version);
        expect(publicDirStorageId).toMatch(hexRegExp);
    });

    it('Should add route to `routes.json` and deploy it', async () => {
        expect.assertions(1);
        const routesPath = path.join(__dirname, '..', 'resources', 'sample_site', 'routes.json');
        const routesStr = await readFile(routesPath, 'utf-8');
        const routesObj = JSON.parse(routesStr);
        const newRoute = `/${publicDirStorageId}`;
        routesObj[newRoute] = 'index.html';
        const routesFileAsBuffer = Buffer.from(JSON.stringify(routesObj, null, 2));
        routesStorageId = await storage.uploadFile(routesFileAsBuffer);
        expect(routesStorageId).toMatch(hexRegExp);
    });

    it('Should add routes to "key-value storage"', async () => {
        expect.assertions(1);
        const {target, version} = testData.deployConfig;
        const res = await blockchain.putZRecord(target, `0x${routesStorageId}`, version);
        expect(res).toBe(undefined);
    });

    it('Should fetch index.html making a GET request to the new domain', async () => {
        expect.assertions(3);
        await delay(5000);

        const res = await axios.get(
            `https://${testData.deployConfig.target}`,
            {httpsAgent}
        );

        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<!DOCTYPE html>/);
        expect(res.data).toMatch('<title>E2E Test Site</title>');
    }, 10000);
});
