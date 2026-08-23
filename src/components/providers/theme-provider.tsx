import React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="normal"
      enableSystem={false}
      themes={['normal', 'light', 'dark', 'awesome']}
    >
      {children}
    </NextThemesProvider>
  );
}
