
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Identity__factory } from "../../typechain"

describe("Token identity contract", function () {

    let identityContract: any;
	let owner: SignerWithAddress;
	let addr1: SignerWithAddress;
	let addr2: SignerWithAddress
	let addrs: SignerWithAddress[];
	let handle: string;

	beforeEach(async function () {
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        const factory = await ethers.getContractFactory("Identity") as Identity__factory;
        identityContract = await factory.deploy()

        handle = 'unittester';

        await identityContract.register(
            handle,
            addr1.address,
            '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce',
            '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb'
        );
	});

	describe("Testing owner functions", function () {
		it("Validating identity owner", async function () {
			const ownerIdentity = await identityContract.getIdentityByOwner(addr1.address);
            expect(ownerIdentity).to.equal(handle);
        });

		it("Validating owner can set IKVvalue", async function () {
            const shouldBe = 'has passed?';
			await identityContract.connect(addr1).ikvPut(handle, 'test', shouldBe)
            const actual = await identityContract.connect(addr1).ikvGet(handle, 'test')
            expect(actual).to.equal(shouldBe);
        });

		it("Validate owner can transfer it's ownership", async function () {
            await expect(
                identityContract.connect(addr1).transferIdentityOwnership(handle, addr2.address)
              ).to.be.emit(identityContract, 'IdentityOwnershipTransferred');

            const ownerIdentity = await identityContract.getIdentityByOwner(addr2.address);
            expect(ownerIdentity).to.equal(handle);
        });

		it("Validating only handle owner can set its IKV value", async function () {
            const shouldBe = 'has passed?';
            await expect(
                identityContract.connect(addr2).ikvPut(handle, 'test', shouldBe)
              ).to.be.revertedWith('You are not the owner of this identity');
        });
	});

	describe("Testing helper functions", function () {
        it("Loads identity public key", async function () {
            const part1 = '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce';
            const part2 = '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb';

			const commPublicKey = await identityContract.connect(addr1).getCommPublicKeyByIdentity(handle);
            expect(commPublicKey.part1).to.equal(part1);
            expect(commPublicKey.part2).to.equal(part2);
        });

        it("Invalid handle", async function () {
            await expect(
                identityContract.register(
                    'invalid*handle',
                    addr1.address,
                    '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce',
                    '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb'
                )
              ).to.be.revertedWith('Only alphanumeric characters and an underscore allowed');
        });

        it("Repeated handle", async function () {
            await expect(
                identityContract.register(
                    handle,
                    addr2.address,
                    '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce',
                    '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb'
                )
              ).to.be.revertedWith('This identity has already been registered');
        });

        it("Repeated handle uppercase", async function () {
            await expect(
                identityContract.register(
                    handle.toUpperCase(),
                    addr2.address,
                    '0xed17268897bbcb67127ed550cee2068a15fdb6f69097eebeb6e2ace46305d1ce',
                    '0xe1e032c91d4c8fe6bab1f198871dbafb8842f073acff8ee9b822f748b180d7eb'
                )
              ).to.be.revertedWith('This identity has already been registered');
        });
    });

	describe("Testing migrator functions", function () {
        it("Owner can migrate IKV to any user", async function () {
            const shouldBe = 'trusted';
			await identityContract.connect(owner).ikvImportKV(handle, 'migrated-by-owner', shouldBe)
            const actual = await identityContract.connect(addr1).ikvGet(handle, 'migrated-by-owner')
            expect(actual).to.equal(shouldBe);
        });
       
        it("Owner can't migrate IKV to any user once migrations are finished", async function () {
            const shouldBe = 'trusted';
            await identityContract.connect(owner).finishMigrations()
            await expect(
                identityContract.connect(owner).ikvImportKV(handle, 'migrated-by-owner', shouldBe)
              ).to.be.revertedWith('Access denied');
        });
    });

});