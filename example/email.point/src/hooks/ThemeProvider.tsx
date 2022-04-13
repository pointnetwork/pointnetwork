import React, { useState } from 'react';
import * as localStorage from '@utils/localStorage';

type Theme = 'light' | 'dark';
type ThemeContext = { theme: Theme; toggleTheme: () => void; darkTheme: boolean };

export const ThemeContext = React.createContext<ThemeContext>({} as ThemeContext);

const THEME_STORAGE_KEY = 'theme';

export const ThemeProvider: React.FC = ({ children }) => {
  const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme | undefined) || 'light';
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setTheme(newTheme);
  };

  const color = theme === 'light' ? '#333' : '#FFF';
  const backgroundColor = theme === 'light' ? '#FFF' : '#333';

  document.body.style.color = color;
  document.body.style.backgroundColor = backgroundColor;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, darkTheme: theme == 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};
