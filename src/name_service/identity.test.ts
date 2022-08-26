import {getIdentity} from './identity';
import solana from '../network/providers/solana';
const ethereum = require('..//network/providers/ethereum');

const ETH_PUBL_KEY =
    '587136dce73d741c6fe8e121dc6176f6af0700942f1183a4f8993f6a799dd53712c54ae5b701d1af9be612675685a14a05074851e11bdf40bafaf074a446c5bd';
const ETH_ADDR = '0xd7f2e11a34d7201dfa826f79e0e85e66eef2cdd9';
const SOL_ADDR = '6YPhEWt6SUaXEtt85TJxw4tTELNHC96DP3bctwxzftXp';

const users: Record<string, Record<string, string | null>> = {
    user_one_address: {
        eth: 'user_one_address',
        sol: 'user_one_address',
        point: null,
        sns: null,
        ens: null
    },
    user_two_address: {
        eth: 'user_two_address',
        sol: 'user_two_address',
        point: 'two.point',
        sns: null,
        ens: null
    },
    user_three_address: {
        eth: 'user_three_address',
        sol: 'user_three_address',
        point: null,
        sns: 'three.sol',
        ens: null
    },
    user_four_address: {
        eth: 'user_four_address',
        sol: 'user_four_address',
        point: null,
        sns: null,
        ens: 'four.eth'
    },
    user_five_address: {
        eth: 'user_five_address',
        sol: 'user_five_address',
        point: 'five.point',
        sns: 'five.sol',
        ens: 'four.eth'
    },
    user_six_address: {
        eth: 'user_six_address',
        sol: 'user_six_address',
        point: null,
        sns: 'six.sol',
        ens: 'six.eth'
    },
    user_seven_address: {
        eth: 'user_seven_address',
        sol: 'user_seven_address',
        point: 'seven.point',
        sns: null,
        ens: 'seven.eth'
    },
    user_eight_address: {
        eth: 'user_eight_address',
        sol: 'user_eight_address',
        point: 'eight.point',
        sns: 'eight.sol',
        ens: 'eight.eth'
    }
};

jest.mock('../wallet/keystore', () => ({
    getNetworkPublicKey: jest.fn(() => ETH_PUBL_KEY),
    getNetworkAddress: jest.fn(() => ETH_ADDR),
    getSolanaKeyPair: jest.fn(() => SOL_ADDR)
}));

jest.mock('../network/providers/ethereum', () => ({
    identityByOwner: jest.fn(async addr => (users[addr] ? users[addr].point : null)),
    getDomain: jest.fn(async addr => (users[addr] ? users[addr].ens : null))
}));

jest.mock('../network/providers/solana', () => ({
    getDomain: jest.fn(async addr => (users[addr] ? users[addr].sns : null)),
    toPublicKey: jest.fn(addr => addr)
}));

afterEach(() => {
    jest.clearAllMocks();
});

describe('getIdentity', () => {
    it('should return null for user without .point, .sol or .eth identity', async () => {
        const id = await getIdentity({
            ethAddress: users.user_one_address.eth ?? undefined,
            solAddress: users.user_one_address.sol ?? undefined
        });

        expect(id.identity).toBeNull();
        expect(ethereum.identityByOwner).toHaveBeenCalledTimes(1);
        expect(ethereum.getDomain).toHaveBeenCalledTimes(1);
        expect(solana.getDomain).toHaveBeenCalledTimes(1);
    });

    it('should return .sol identity and use cache for following requests', async () => {
        const id1 = await getIdentity({
            ethAddress: users.user_three_address.eth ?? undefined,
            solAddress: users.user_three_address.sol ?? undefined
        });

        const id2 = await getIdentity({
            ethAddress: users.user_three_address.eth ?? undefined,
            solAddress: users.user_three_address.sol ?? undefined
        });

        expect(id1.identity).toEqual(users.user_three_address.sns);
        expect(id2.identity).toEqual(id1.identity);
        expect(solana.getDomain).toHaveBeenCalledTimes(1);
    });

    it('should return .eth identity and use cache for following requests', async () => {
        const id1 = await getIdentity({
            ethAddress: users.user_four_address.eth ?? undefined,
            solAddress: users.user_four_address.sol ?? undefined
        });

        const id2 = await getIdentity({
            ethAddress: users.user_four_address.eth ?? undefined,
            solAddress: users.user_four_address.sol ?? undefined
        });

        expect(id1.identity).toEqual(users.user_four_address.ens);
        expect(id2.identity).toEqual(id1.identity);
        expect(ethereum.getDomain).toHaveBeenCalledTimes(1);
    });

    it('should return .point identity and use cache for following requests', async () => {
        const id1 = await getIdentity({
            ethAddress: users.user_two_address.eth ?? undefined,
            solAddress: users.user_two_address.sol ?? undefined
        });

        const id2 = await getIdentity({
            ethAddress: users.user_two_address.eth ?? undefined,
            solAddress: users.user_two_address.sol ?? undefined
        });

        expect(id1.identity).toEqual(users.user_two_address.point);
        expect(id2.identity).toEqual(id1.identity);
        expect(ethereum.identityByOwner).toHaveBeenCalledTimes(1);
    });

    it('should pick .point over .sol and .eth', async () => {
        const id1 = await getIdentity({
            ethAddress: users.user_five_address.eth ?? undefined,
            solAddress: users.user_five_address.sol ?? undefined
        });

        const id2 = await getIdentity({
            ethAddress: users.user_five_address.eth ?? undefined,
            solAddress: users.user_five_address.sol ?? undefined
        });

        expect(id2.identity).toEqual(users.user_five_address.point);
        expect(id2.identity).toEqual(id1.identity);
    });

    it('should pick .sol over .eth', async () => {
        const id1 = await getIdentity({
            ethAddress: users.user_six_address.eth ?? undefined,
            solAddress: users.user_six_address.sol ?? undefined
        });

        const id2 = await getIdentity({
            ethAddress: users.user_six_address.eth ?? undefined,
            solAddress: users.user_six_address.sol ?? undefined
        });

        expect(solana.getDomain).toHaveBeenCalledTimes(1);
        expect(ethereum.getDomain).not.toHaveBeenCalled();
        expect(id1.identity).toEqual(users.user_six_address.sns);
        expect(id2.identity).toEqual(id1.identity);
    });

    it('should only try to resolve .sol', async () => {
        const id = await getIdentity({
            solAddress: users.user_seven_address.sol ?? undefined,
            targets: ['solana']
        });

        expect(solana.getDomain).toHaveBeenCalledTimes(1);
        expect(ethereum.getDomain).not.toHaveBeenCalled();
        expect(ethereum.identityByOwner).not.toHaveBeenCalled();
        expect(id.identity).toEqual(users.user_seven_address.sns);
    });

    it('should only try to resolve .eth', async () => {
        const id = await getIdentity({
            ethAddress: users.user_eight_address.eth ?? undefined,
            targets: ['ethereum']
        });

        expect(ethereum.getDomain).toHaveBeenCalledTimes(1);
        expect(solana.getDomain).not.toHaveBeenCalled();
        expect(ethereum.identityByOwner).not.toHaveBeenCalled();
        expect(id.identity).toEqual(users.user_eight_address.ens);
    });
});
