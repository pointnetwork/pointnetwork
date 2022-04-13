import { Dispatch } from 'redux';

import { identityActions } from './slice';

import * as WalletService from '@services/WalletService';
import * as IdentityService from '@services/IdentityService';

export const syncActions = identityActions;

export const loadIdentity = () => {
  return async (dispatch: Dispatch) => {
    try {
      const walletAddress = await WalletService.getAddress();
      const identity = await IdentityService.ownerToIdentity(walletAddress);
      const publicKey = await IdentityService.publicKeyByIdentity(identity);

      dispatch(
        identityActions.loadIdentity({
          walletAddress,
          identity,
          publicKey,
        })
      );
    } catch (error) {
      console.error(error);
      dispatch(
        identityActions.loadIdentity({
          walletError: error,
        })
      );
    }
  };
};
