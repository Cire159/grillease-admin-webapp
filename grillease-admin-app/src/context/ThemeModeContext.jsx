import React, { createContext, useContext } from 'react';

const ThemeModeContext = createContext({ mode: 'light', setMode: () => {} });

export const ThemeModeProvider = ({ mode = 'light', setMode, children }) => {
  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);

export default ThemeModeContext;
