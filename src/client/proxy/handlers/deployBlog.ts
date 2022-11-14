import {CONTRACT_PREFIX, deployUpgradableContracts, getManyKeys, ROOT_DIR_KEY, ZDNS_ROUTES_KEY} from '../../../network/deployer';
import ethereum from '../../../network/providers/ethereum';
import {getNetworkAddress, getNetworkPublicKey} from '../../../wallet/keystore';
import {getFile} from '../../storage';

const KNOWN_BLOG_ABI_HASHES = ['abcde']; // here we need to put known abi hashes
const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000';
const BLOG_DEPENDENCIES = ['@openzeppelin/contracts', '@openzeppelin/contracts-upgradeable'];
const VERSION = '0.1';

const ROOT_DIR_ID =
    '84708e41326d1d918aeff47be062e3b5d9d6e9e2b53b0e8e4402f099e6e08f05';
const ROUTES_FILE_ID =
    '2c86280cf0de02dc4ea28c56102a648615bd8d39f04be1a6e8a26ed0b803b1b6';
const CONTRACT_SOURCE_ID =
  '446df1df573d550c0b394395ecb399becee6c0edb817427e94c61355a60a0b0b';
const CURRENT_ABI_ID = 'f826e95ad2d15868a7937f478fc4ba7b6322bb33ba429bd244b90ff26b9e73d3';

// const ROOT_DIR_ID =
//     '6ce5c3f525128f4173cd4931870b28d05280d66bd206826be1f23242d05c94bb';
// const ROUTES_FILE_ID =
//      '5f38f36718c426e74ded142347ecc4310e8eb4755c31ce06bcecd26cdbfe7b41';
// const CONTRACT_SOURCE_ID =
//   'c8951747b4ca81c2255f14fe99791f4d663e8448607d2fde4c6c9e81a3be3fa1';
// const CURRENT_ABI_ID = '8aa25d3d1c0800f89ccd1a714c859657d881770732b6ee01f8844e8739c2b83b';

export async function getBlogContractCode() {
    return getFile(CONTRACT_SOURCE_ID);
}

export async function createSubidentity(subidentity: string) {
    const [subidentityPart, parentIdentity] = subidentity.split('.');
    const publicKey = getNetworkPublicKey();
    const owner = getNetworkAddress();
    const tx = await ethereum.registerSubIdentity(
        subidentityPart,
        parentIdentity,
        owner,
        Buffer.from(publicKey, 'hex')
    );
    if (tx?.blockHash) {
        return;
    }
    throw 'Could not create subidentity';
}

export async function ensureSubidentity(subidentity: string) {
    const id = await ethereum.ownerByIdentity(subidentity);
    if (id === EMPTY_ADDRESS) {
        await createSubidentity(subidentity);
        return true;
    }
    return false;
}

export async function setRootDir(subidentity: string, address: string) {
    return ethereum.putKeyValue(
        subidentity,
        ROOT_DIR_KEY,
        address,
        VERSION
    );
}
export async function setRoutes(subidentity: string, address: string) {
    return ethereum.putKeyValue(
        subidentity,
        ZDNS_ROUTES_KEY,
        address,
        VERSION
    );
}

export async function isUpgreadableBlog(subidentity: string, abiAddress: string) {
    const [zdnsRoutes, blogContractAddress] = await getManyKeys(subidentity, [
        'zdns/routes',
        `${CONTRACT_PREFIX}/address/Blog`
    ]);
    if (zdnsRoutes) {
        const routes = await getFile(zdnsRoutes);
        routes.includes(`"/blog": "index.html"`);
        if (blogContractAddress && await verifyBlogABI(abiAddress)) {
            return true;
        } else {
            throw 'A website is already deployed on this address. Please, choose another subidentity';
        }
    }
}

export function needsToUpdateContract(abiAddress: string) {
    return abiAddress !== CURRENT_ABI_ID;
}
export async function deployBlog(subidentity: string) {
    const isNewIdentity = await ensureSubidentity(subidentity);
    const [abiAddress] = await getManyKeys(subidentity, [`${CONTRACT_PREFIX}/abi/Blog`]);
    if (!isNewIdentity && !await isUpgreadableBlog(subidentity, abiAddress)) {
        throw 'Is not an upgreadable blog';
    }
    const [rootDir, routes] = await getManyKeys(
        subidentity, [
            ROOT_DIR_KEY,
            ZDNS_ROUTES_KEY
        ]
    );
    const blogContract = await getBlogContractCode();
    if (needsToUpdateContract(abiAddress)) {
        await deployUpgradableContracts({
            contracts: [{file: Buffer.from(blogContract), name: 'Blog'}],
            version: VERSION,
            target: subidentity,
            forceDeployProxy: isNewIdentity,
            dependencies: BLOG_DEPENDENCIES
        });
    }
    if (rootDir !== ROOT_DIR_ID) {
        await setRootDir(subidentity, ROOT_DIR_ID);
    }
    if (routes !== ROUTES_FILE_ID) {
        await setRoutes(subidentity, ROUTES_FILE_ID);
    }
}

export async function getRootDir(identity: string) {
    return ethereum.getKeyValue(
        identity,
        '::rootDir'
    );
}

export async function getRoutes(identity: string) {
    return ethereum.getKeyValue(
        identity,
        'zdns/routes'
    );
}

export async function getBlogAddress(identity: string) {
    return ethereum.getKeyValue(
        identity

    );
}

export async function getBlogABI(identity: string) {
    return ethereum.getKeyValue(
        identity,
        'zweb/contracts/abi/Blog'
    );
}

export async function getBlogMetadata(identity: string) {
    return ethereum.getKeyValue(
        identity,
        'zweb/contracts/proxy/metadata'
    );
}

export async function verifyBlogABI(abiAddress: string) {
    if (KNOWN_BLOG_ABI_HASHES.includes(abiAddress)) {
        return true;
    }
    const file = await getFile(abiAddress);
    if (file.includes(`"contractName":"Blog"`)) {
        return true;
    }
    return false;
}
