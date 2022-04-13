import { GlobalState } from '../../types';

export const getWalletAddress = (state: GlobalState) => state.identity.walletAddress;
export const getWalletError = (state: GlobalState) => state.identity.walletError;
export const getIdentity = (state: GlobalState) => state.identity.identity;
export const getPublicKey = (state: GlobalState) => state.identity.publicKey;
