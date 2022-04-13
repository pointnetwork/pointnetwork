import { CaseReducer, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { State } from './types';

const loadIdentity: CaseReducer<State, PayloadAction<State>> = (state, action) => {
  const { walletAddress, identity, walletError, publicKey } = action.payload;
  state.walletAddress = walletAddress;
  state.identity = identity;
  state.walletError = walletError;
  state.publicKey = publicKey;
};

const initialState: State = {
  walletAddress: undefined,
  walletError: undefined,
  identity: undefined,
  publicKey: undefined,
};

const identitySlice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    loadIdentity,
  },
});

export const identityActions = identitySlice.actions;

export default identitySlice;
