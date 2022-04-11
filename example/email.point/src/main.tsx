import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { Provider } from 'react-redux';

import { ThemeProvider } from '@hooks/ThemeProvider';
import { AppContextProvider } from '@hooks/AppContext';

import store from '@store/index';

import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <AppContextProvider>
          <App />
        </AppContextProvider>
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
  document.getElementById('root')
);
