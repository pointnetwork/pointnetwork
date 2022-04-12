import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '@hooks/ThemeProvider';
import { Routes, Route, useLocation } from 'react-router-dom';

// pages
import Compose from '@pages/Compose';
import Inbox from '@pages/Inbox';
import Show from '@pages/Show';
import Error from '@pages/Error';

import Header from '@components/Header';
import Sidebar from '@components/Sidebar';
import Notification from '@components/Notification';

export default function App() {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const { darkTheme } = useContext(ThemeContext);

  async function getIdentity() {}

  useEffect(() => {
    getIdentity();
  }, []);

  const location = useLocation();

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
          <Routes>
            <Route path="/" element={<Inbox />} />
            <Route path="/compose" element={<Compose />} />
            <Route path="/show" element={<Show />} />
            <Route path="*" element={<Error />} />
          </Routes>
        </main>
        <Notification />
      </div>
    </div>
  );
}
