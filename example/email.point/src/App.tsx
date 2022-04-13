import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@hooks/ThemeProvider';
import { Routes, Route } from 'react-router-dom';

import { useDispatch, useSelector } from 'react-redux';

// pages
import Compose from '@pages/Compose';
import Inbox from '@pages/Inbox';
import Sent from '@pages/Sent';
import Show from '@pages/Show';
import Important from '@pages/Important';
import Trash from '@pages/Trash';
import Error from '@pages/Error';

import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import Notification from '@components/Notification';

import { actions as uiActions } from '@store/modules/ui';
import {
  selectors as identitySelectors,
  actions as identityActions,
} from '@store/modules/identity';

export default function App() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const { darkTheme } = useContext(ThemeContext);

  const dispatch = useDispatch();

  const walletError = useSelector(identitySelectors.getWalletError);

  useEffect(() => {
    if (walletError) {
      dispatch(
        uiActions.showErrorNotification({
          message: `Couldn't load your identity.`,
        })
      );
    }
  }, [walletError]);

  useEffect(() => {
    dispatch(identityActions.loadIdentity());
  }, []);

  return (
    <div
      className={`
        ${isSideMenuOpen ? 'overflow-hidden' : ''} 
        ${darkTheme ? 'dark' : ''}
        flex h-screen bg-gray-50
      `}
    >
      <Sidebar isOpen={isSideMenuOpen} openSidebar={setIsSideMenuOpen} />
      <div className="flex flex-col flex-1 w-full dark:bg-gray-900">
        <Header toggleSidebar={() => setIsSideMenuOpen((val) => !val)} />
        <main className="h-full overflow-y-auto py-3">
          <Routes>
            <Route path="/" element={<Inbox />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/show" element={<Show />} />
            <Route path="/sent" element={<Sent />} />
            <Route path="/important" element={<Important />} />
            <Route path="/trash" element={<Trash />} />
            <Route path="*" element={<Error />} />
          </Routes>
        </main>
        <Notification />
      </div>
    </div>
  );
}
