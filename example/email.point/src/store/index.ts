import { configureStore } from '@reduxjs/toolkit';
import logger from 'redux-logger';

import uiSlice from './modules/ui/slice';

const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

export default store;
