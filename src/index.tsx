import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './components/ThemeProvider'; // Importer ThemeProvider

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Initialiser auth store før rendering av appen
const initializeApp = async () => {
  const initialize = useAuthStore.getState().initialize;
  await initialize();
 
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
};

initializeApp();