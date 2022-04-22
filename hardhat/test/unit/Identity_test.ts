
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
			await identityContract.connect(addr1).ikvPut(handle, 'test', shouldBe, 'latest')
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

		it("Validating can't transfer ownership to address 0", async function () {
            await expect(
                identityContract.connect(addr1).transferIdentityOwnership(handle, '0x0000000000000000000000000000000000000000')
              ).to.be.revertedWith("Can't transfer ownership to address 0");
        });

		it("Validating can't transfer ownership to itself", async function () {
            await expect(
                identityContract.connect(addr1).transferIdentityOwnership(handle, addr1.address)
              ).to.be.revertedWith("Can't transfer ownership to same address");
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
			await identityContract.connect(owner).ikvImportKV(handle, 'migrated-by-owner', shouldBe, 'latest')
            const actual = await identityContract.connect(addr1).ikvGet(handle, 'migrated-by-owner')
            expect(actual).to.equal(shouldBe);
        });
       
        it("Owner can't migrate IKV to any user once migrations are finished", async function () {
            const shouldBe = 'trusted';
            await identityContract.connect(owner).finishMigrations()
            await expect(
                identityContract.connect(owner).ikvImportKV(handle, 'migrated-by-owner', shouldBe, 'latest')
              ).to.be.revertedWith('Access denied');
        });
    });


    describe("Testing deployer functions", function () {
        it("Owner can add deployer to its identity", async function () {
            const shouldBe = 'trusted';
            await expect(
                identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
            ).not.to.be.revertedWith('You are not the owner of this identity');
        });

        it("Deployer can set ikv", async function () {
            const shouldBe = 'trusted';
			await identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
            await identityContract.connect(addr2).ikvPut(handle, 'test', shouldBe, 'latest')
            const actual = await identityContract.connect(addr1).ikvGet(handle, 'test')
            expect(actual).to.equal(shouldBe);
        });

        it("Other than deployer can't set its IKV value", async function () {
            const shouldBe = 'has passed?';
            await expect(
                identityContract.connect(addr2).ikvPut(handle, 'test', shouldBe, 'latest')
              ).to.be.revertedWith('You are not deployer of this identity');
        });

        it("Other than owner can't add deployer to identity", async function () {
            await expect(
                identityContract.connect(addr2).addIdentityDeployer(handle, addr2.address)
              ).to.be.revertedWith('You are not the owner of this identity');
        });

        it("Can't set address 0 as deployer", async function () {
            await expect(
                identityContract.connect(addr1).addIdentityDeployer(handle, '0x0000000000000000000000000000000000000000')
              ).to.be.revertedWith('Can\'t set address 0 as deployer');
        });

        it("Can't set owner as deployer", async function () {
            await expect(
                identityContract.connect(addr1).addIdentityDeployer(handle, addr1.address)
              ).to.be.revertedWith('Owner is already a deployer');
        });

        it("Can't add deployer twice", async function () {
            await identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
            await expect(
                identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
              ).to.be.revertedWith('Address already setted as deployer');
        });

        it("Owner can remove deployer to their identity", async function () {
            await identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
            await expect(
                identityContract.connect(addr1).removeIdentityDeployer(handle, addr2.address)
            ).not.to.be.revertedWith('You are not the owner of this identity');
        });

        it("Deployer removed can't set ikv", async function () {
            const shouldBe = 'trusted';
			await identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address)
            await identityContract.connect(addr1).removeIdentityDeployer(handle, addr2.address)
            await expect(
                identityContract.connect(addr2).ikvPut(handle, 'test', shouldBe, 'latest')
            ).to.be.revertedWith('You are not deployer of this identity');
        });

        it("Can't remove 0 as deployer", async function () {
            await expect(
                identityContract.connect(addr1).removeIdentityDeployer(handle, '0x0000000000000000000000000000000000000000')
              ).to.be.revertedWith('Can\'t remove address 0 as deployer');
        });

        it("Can't remove owner as deployer", async function () {
            await expect(
                identityContract.connect(addr1).removeIdentityDeployer(handle, addr1.address)
              ).to.be.revertedWith('Owner can\'t be removed as a deployer');
        });

        it("Can't remove a deployer that is not a deployer", async function () {
            await expect(
                identityContract.connect(addr1).removeIdentityDeployer(handle, addr2.address)
              ).to.be.revertedWith('Address is not a deployer');
        });

        it("Can query if an address is a deployer", async function () {
            const isOwnerDeployer = await identityContract.connect(addr1)
                .isIdentityDeployer(handle, addr1.address);
            expect(isOwnerDeployer).to.equal(true);

            const isNotDeployer = await identityContract.connect(addr1)
                .isIdentityDeployer(handle, addr2.address);
            expect(isNotDeployer).to.equal(false);
            
            await identityContract.connect(addr1).addIdentityDeployer(handle, addr2.address);
            const isADeployer = await identityContract.connect(addr1)
                .isIdentityDeployer(handle, addr2.address);
            expect(isADeployer).to.equal(true);
        });
       
    });

});