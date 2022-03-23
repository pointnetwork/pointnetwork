import path from 'path';
import {readFile} from 'fs/promises';
import axios from 'axios';
import blockchain from '../../src/network/blockchain';
import {getNetworkPublicKey, getNetworkAddress} from '../../src/wallet/keystore';
import {uploadFile, uploadDir} from '../../src/client/storage';
import {delay} from '../../src/core/utils';
import {getContractAddress} from '../../src/util/contract';

jest.setTimeout(300000);
jest.retryTimes(60);

const testData = {address: '', commPublicKey: '', deployConfig: null};

async function initTestData() {
    const filePath = path.join(__dirname, '..', 'resources', 'sample_site', 'point.deploy.json');
    const deployConfigFile = await readFile(filePath, 'utf-8');
    testData.address = getNetworkAddress();
    testData.commPublicKey = getNetworkPublicKey();
    testData.deployConfig = JSON.parse(deployConfigFile);
}

beforeAll(() => {
    process.env.IDENTITY_CONTRACT_ADDRESS = getContractAddress('Identity');
    return initTestData();
});

describe('Register identity and deploy site', () => {
    const hexRegExp = /^[0-9A-Fa-f]{16,}$/;
    let publicDirStorageId;
    let routesStorageId;

    it('Should register a new identity', async () => {
        expect.assertions(5);
        await delay(5000);

        const {target} = testData.deployConfig;
        const identity = target.replace(/\.z$/, '');

        const result = await blockchain.registerIdentity(
            identity,
            testData.address,
            Buffer.from(testData.commPublicKey, 'hex')
        );

        expect(result).toBeTruthy();
        expect(result.from).toEqual(testData.address);
        expect(result.blockNumber).toBeGreaterThan(0);
        expect(result.gasUsed).toBeGreaterThan(0);
        expect(result.status).toBe(true);
    });

    it('Should find the new identity in the blockchain', async () => {
        expect.assertions(1);

        const identity0 = await blockchain.callContract(
            '@',
            'Identity',
            'identityList',
            [0],
            'latest'
        );

        const identity1 = await blockchain.callContract(
            '@',
            'Identity',
            'identityList',
            [1],
            'latest'
        );

        const got = [identity0, identity1];
        expect(got).toContain(testData.deployConfig.target.replace(/\.z$/, ''));
    });

    it('Should deploy the sample site to arweave', async () => {
        expect.assertions(1);
        const publicDir = path.join(__dirname, '..', 'resources', 'sample_site', 'public');
        publicDirStorageId = await uploadDir(publicDir);
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
        routesStorageId = await uploadFile(routesFileAsBuffer);
        expect(routesStorageId).toMatch(hexRegExp);
    });

    it('Should add routes to "key-value storage"', () => {
        expect.assertions(1);
        expect(async () => {
            const {target, version} = testData.deployConfig;
            await blockchain.putZRecord(target, `0x${routesStorageId}`, version);
        }).not.toThrow();
    });

    it('Should fetch index.html making a GET request to the new domain', async () => {
        expect.assertions(3);
        await delay(5000);

        const res = await axios.get(`https://${testData.deployConfig.target}`, {
            proxy: {host: 'point_node', port: 8666, protocol: 'https'},
            maxRedirects: 0,
            validateStatus: () => true
        });

        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<!DOCTYPE html>/);
        expect(res.data).toMatch('<title>E2E Test Site</title>');
    });

    it('Should fetch index.html making a GET request to the "dynamicly created route"', async () => {
        expect.assertions(3);

        const res = await axios.get(
            `https://${testData.deployConfig.target}/${publicDirStorageId}`,
            {
                proxy: {host: 'point_node', port: 8666, protocol: 'https'},
                maxRedirects: 0,
                validateStatus: () => true
            }
        );

        expect(res.status).toEqual(200);
        expect(res.data).toMatch(/^<!DOCTYPE html>/);
        expect(res.data).toMatch('<title>E2E Test Site</title>');
    });
});
