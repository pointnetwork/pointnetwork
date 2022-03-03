
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { StorageProviderRegistry__factory } from "../../typechain"

describe("Token identity contract", function () {

    let storageProviderRegistry: any;
	let owner: SignerWithAddress;
	let addr1: SignerWithAddress;
	let addr2: SignerWithAddress
	let addrs: SignerWithAddress[];
    let provider: string;


	beforeEach(async function () {
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const factory = await ethers.getContractFactory("StorageProviderRegistry") as StorageProviderRegistry__factory;
        storageProviderRegistry = await factory.deploy();
        provider = '0x3C903ADdcC954B318A5077D0f7bce44a7b9c95B1';
	});

	describe("Testing announcement", function () {
        const connectionStorage = "http://fake:9685/#fake_storage;"
        const costPerKb = 5;
        const collateralLockPeriod = 500;

        it("Can't create annoucement without ether", async function () {
            await expect(
                storageProviderRegistry.announce(
                    connectionStorage,
                    collateralLockPeriod,
                    costPerKb
                    )
              ).to.be.revertedWith('No collateral supplied');
        });

        it("Create annoucement ether", async function () {

            const deposit = ethers.utils.parseUnits('4', 'wei');

            await storageProviderRegistry.announce(
                connectionStorage,
                collateralLockPeriod,
                costPerKb
            ,{value:deposit});

            const providerInfo = await storageProviderRegistry.getProvider(owner.address);
            expect(providerInfo['connection']).to.be.equal(connectionStorage);
            expect(providerInfo['costPerKb']).to.be.equal(costPerKb);

            const cheapestProvider = await storageProviderRegistry.getCheapestProvider();
            expect(cheapestProvider).to.be.equal(owner.address);
        });

        it("Create expensive provider", async function () {

            const deposit = ethers.utils.parseUnits('100', 'ether');

            await storageProviderRegistry.announce(
                connectionStorage,
                collateralLockPeriod,
                costPerKb
            ,{value:deposit});

            const providerInfo = await storageProviderRegistry.getProvider(owner.address);
            expect(providerInfo['connection']).to.be.equal(connectionStorage);
            expect(providerInfo['costPerKb']).to.be.equal(costPerKb);

            const cheapestProvider = await storageProviderRegistry.getCheapestProvider();
            expect(cheapestProvider).to.be.equal(provider);
        });
    });

	describe("Testing view functions", function () {
        it("Get chepeast provider", async function () {
			const cheapestProvider = await storageProviderRegistry.getCheapestProvider();
            expect(cheapestProvider).to.be.equal(provider);
        });

        it("Get all provider ids", async function () {
			const providerIds = await storageProviderRegistry.getAllProviderIds();
            expect(providerIds[0]).to.be.equal(provider);
        });

        it("Get provider by id", async function () {
            const providerInfo = await storageProviderRegistry.getProvider(provider);
            const {connection, costPerKb} = providerInfo;
            expect(connection).to.be.equal('http://storage_provider:9685/#3c903addcc954b318a5077d0f7bce44a7b9c95b1');
            expect(costPerKb).to.be.equal('5');
        });
    });

});