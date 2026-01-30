import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import createAppTheme from './theme';
import { ThemeModeProvider } from './context/ThemeModeContext';
import { useState, useMemo } from 'react';
import client from './lib/appwrite';

console.log('✅ main.jsx loaded');
console.log('✅ Rendering app to root element');

client.ping()
  .then(() => {
    console.log('✅ Appwrite server ping successful');
  })
  .catch((error) => {
    console.error('❌ Appwrite server ping failed', error);
  });

const Root = () => {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <React.StrictMode>
      <ThemeModeProvider mode={mode} setMode={setMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </ThemeModeProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);

console.log('✅ App rendered');
