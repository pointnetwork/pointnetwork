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

      dispatch(
        identityActions.loadIdentity({
          walletAddress,
          identity,
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
