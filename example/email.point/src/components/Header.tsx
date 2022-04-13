import React, { useContext } from 'react';
import { ThemeContext } from '@hooks/ThemeProvider';
import { MoonIcon, SunIcon, MenuIcon } from '@heroicons/react/solid';

const Header: React.FC<{ toggleSidebar: Function }> = (props) => {
  const { toggleSidebar } = props;

  const { toggleTheme, darkTheme } = useContext(ThemeContext);

  return (
    <header className="z-10 py-4 bg-white shadow-md dark:bg-gray-800">
      <div className="container flex items-center justify-between h-full px-6 mx-auto text-gray-600 dark:text-gray-300">
        <button
          className="p-1 mr-5 -ml-1 rounded-md md:hidden focus:outline-none focus:shadow-outline-gray"
          onClick={() => toggleSidebar()}
          aria-label="Menu"
        >
          <MenuIcon className="w-4 h-4" />
        </button>

        <div className="flex justify-center flex-1 lg:mr-32"></div>
        <ul className="flex items-center flex-shrink-0 space-x-6">
          <li className="flex">
            <button
              className="rounded-md focus:outline-none focus:shadow-outline-gray"
              onClick={toggleTheme}
              aria-label="Toggle color mode"
            >
              {darkTheme ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
            </button>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default Header;
