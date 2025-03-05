import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider';

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="system">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);