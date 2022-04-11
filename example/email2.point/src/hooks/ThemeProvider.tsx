import React, { useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeContext = { theme: Theme; toggleTheme: () => void; darkTheme: boolean };

export const ThemeContext = React.createContext<ThemeContext>({} as ThemeContext);

export const ThemeProvider: React.FC = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
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
