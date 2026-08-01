import React, { createContext, useContext, useMemo } from 'react';
import { SHASHWAT_DARK_THEME, ThemeTokens } from '../../theme/themeConfig';

interface ThemeContextValue {
  theme: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => ({ theme: SHASHWAT_DARK_THEME }), []);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeTokens => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return SHASHWAT_DARK_THEME;
  }
  return ctx.theme;
};
