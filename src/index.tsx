import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './components/ThemeProvider';

// Ny Error Boundary-komponent
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state: {hasError: boolean, error: Error | null} = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger feilen til konsollen for debugging
    console.error("Applikasjonsfeil:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Styled error message
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{backgroundColor: '#f8fafc'}}>
          <div style={{
            maxWidth: '500px',
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #eaeaea'
          }}>
            <h1 style={{fontSize: '24px', color: '#ef4444', marginBottom: '16px'}}>
              Oops! Something went wrong
            </h1>
            <div style={{color: '#4b5563', marginBottom: '16px'}}>
              {this.state.error?.message || 'An unknown error occurred.'}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Improved error handling in initialization
const initializeApp = async () => {
  try {
    // Add a console log to see that initialization is starting
    console.log('Starting app initialization');
    
    const initialize = useAuthStore.getState().initialize;
    await initialize();
    
    console.log('Initialization complete, rendering app');
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error initializing the app:', error);
    
    // Render a simple error message without using components
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;';
    errorDiv.innerHTML = `
      <div style="max-width:500px;padding:20px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
        <h1 style="font-size:24px;color:#ef4444;margin-bottom:16px;">Could not start the application</h1>
        <p style="margin-bottom:16px;">An error occurred while loading the app. Please reload the page.</p>
        <button onclick="window.location.reload()" style="padding:8px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
          Reload page
        </button>
      </div>
    `;
    
    // Remove any previous content and insert the error message
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = '';
      rootElement.appendChild(errorDiv);
    }
  }
};

// Add a 10-second timeout as a safety mechanism
const initTimeout = setTimeout(() => {
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.childElementCount === 0) {
    console.error('App initialization took too long or stalled');
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <div style="max-width:500px;padding:20px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
          <h1 style="font-size:24px;color:#ef4444;margin-bottom:16px;">Loading took too long</h1>
          <p style="margin-bottom:16px;">The application took too long to load. Please reload the page.</p>
          <button onclick="window.location.reload()" style="padding:8px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
            Reload page
          </button>
        </div>
      </div>
    `;
  }
}, 10000);

// Start initialization
initializeApp().finally(() => clearTimeout(initTimeout));