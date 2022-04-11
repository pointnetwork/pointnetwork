import React, { useState, useContext } from 'react';
import { ThemeContext } from '@hooks/ThemeProvider';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const windowWithEthereum = window as unknown as WindowWithPoint;

import Compose from '@pages/Compose';
import EncryptSend from '@pages/EncryptSend';
import Inbox from '@pages/Inbox';
import Show from '@pages/Show';

import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import Notification from '@components/Notification';

export default function App() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const { darkTheme } = useContext(ThemeContext);

  return (
    <div
      className={`
        ${isSideMenuOpen ? 'overflow-hidden' : ''} 
        ${darkTheme ? 'dark' : ''}
        flex h-screen bg-gray-50
      `}
    >
      <Sidebar isOpen={isSideMenuOpen} openSidebar={setIsSideMenuOpen} />
      <div className="flex flex-col flex-1 w-full">
        <Header />
        <main className="h-full overflow-y-auto dark:bg-gray-900 py-3">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Inbox />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/show" element={<Show />} />
              <Route path="/_encrypt_send" element={<EncryptSend />} />
            </Routes>
          </BrowserRouter>
        </main>
      </div>
    </div>
  );
}
