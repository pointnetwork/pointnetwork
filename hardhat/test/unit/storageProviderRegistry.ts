
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
	let handle: string;

});