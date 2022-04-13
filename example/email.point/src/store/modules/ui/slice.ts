import { CaseReducer, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { State, Notification } from './types';

const showNotification: CaseReducer<State, PayloadAction<Notification>> = (state, action) => {
  const { status, title, message } = action.payload;
  state.notification = {
    status,
    title,
    message,
  };
};

const hideNotification: CaseReducer<State, PayloadAction<void>> = (state) => {
  state.notification = null;
};

const initialState: State = {
  notification: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showNotification,
    hideNotification,
  },
});

export const uiActions = uiSlice.actions;

export default uiSlice;
