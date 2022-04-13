import { configureStore } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import uiSlice from './modules/ui/slice';
import identitySlice from './modules/identity/slice';

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    identity: identitySlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export default store;
