import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { useAuthStore } from './store/authStore';
import { ThemeProvider } from './components/ThemeProvider';

// Improved Error Boundary component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null}> {
  // Improved state to include errorInfo
  state: {hasError: boolean, error: Error | null, errorInfo: React.ErrorInfo | null} = { 
    hasError: false, 
    error: null,
    errorInfo: null
  };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error("Application error:", error);
    console.error("Component stack:", errorInfo.componentStack);
    
    // Update state with errorInfo for more detailed reporting
    this.setState({ errorInfo });
    
    // You could add error reporting service here
    // Example: reportErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      // Improved error UI with better styling and more details
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{backgroundColor: '#f8fafc'}}>
          <div style={{
            maxWidth: '600px',
            padding: '24px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            border: '1px solid #eaeaea'
          }}>
            <h1 style={{fontSize: '24px', color: '#ef4444', marginBottom: '16px'}}>
              Oops! Something went wrong
            </h1>
            <div style={{color: '#4b5563', marginBottom: '16px', textAlign: 'left'}}>
              <p style={{marginBottom: '8px', fontWeight: 'bold'}}>Error:</p>
              <p style={{
                padding: '8px', 
                backgroundColor: '#f9fafb', 
                borderRadius: '4px',
                overflowX: 'auto',
                fontFamily: 'monospace',
                marginBottom: '16px'
              }}>
                {this.state.error?.message || 'An unknown error occurred.'}
              </p>
            </div>
            <div style={{marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '10px'}}>
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
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  document.cookie.split(';').forEach(c => {
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
                  });
                  window.location.href = '/';
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#1f2937',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Clear data & restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Get the root element
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;">
      <div style="text-align:center;max-width:500px;">
        <h1 style="color:#ef4444;font-size:24px;margin-bottom:16px;">Critical Error</h1>
        <p style="margin-bottom:16px;">The application could not be loaded because the root element was not found.</p>
        <button onclick="window.location.reload()" style="padding:8px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
          Reload page
        </button>
      </div>
    </div>
  `;
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Show initial loading state
rootElement.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
    <div style="text-align:center;max-width:500px;">
      <h1 style="color:#059669;font-size:24px;margin-bottom:16px;">Zarium</h1>
      <div style="width:40px;height:40px;margin:20px auto;border:4px solid rgba(5,150,105,0.2);border-radius:50%;border-top-color:#059669;animation:spin 1s linear infinite;"></div>
      <p>Loading application...</p>
    </div>
  </div>
  <style>
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`;

// Improved error handling in initialization
const initializeApp = async () => {
  try {
    // Add clear console and initialization message
    if (process.env.NODE_ENV === 'development') {
      console.clear();
    }
    console.log('%c🚀 Starting Zarium application...', 'font-weight:bold;color:#059669;');
    
    // Initialize auth state
    const initialize = useAuthStore.getState().initialize;
    await initialize();
    
    console.log('%c✅ Initialization complete, rendering app...', 'font-weight:bold;color:#059669;');
    
    // Render the app with error boundary
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
    
    // Render error message - improved version
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <div style="max-width:500px;padding:24px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
          <h1 style="font-size:24px;color:#ef4444;margin-bottom:16px;">Application Initialization Failed</h1>
          <p style="margin-bottom:16px;color:#4b5563;">We encountered an error while loading the application.</p>
          <div style="background-color:#f9fafb;border-radius:4px;padding:12px;margin-bottom:16px;text-align:left;font-family:monospace;overflow-x:auto;">
            ${error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <div style="display:flex;justify-content:center;gap:10px;">
            <button onclick="window.location.reload()" style="padding:8px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
              Reload page
            </button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); document.cookie.split(';').forEach(c => document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')); window.location.href='/';" style="padding:8px 16px;background-color:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
              Clear data & restart
            </button>
          </div>
        </div>
      </div>
    `;
  }
};

// Add a safety timeout mechanism with better UX
const initTimeout = setTimeout(() => {
  // Only show timeout message if app hasn't rendered yet
  const hasAppContent = !rootElement.innerHTML.includes('Loading application');
  if (!hasAppContent) {
    console.error('App initialization took too long or stalled');
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
        <div style="max-width:500px;padding:24px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
          <h1 style="font-size:24px;color:#ea580c;margin-bottom:16px;">Loading is taking longer than expected</h1>
          <p style="margin-bottom:24px;color:#4b5563;">This could be due to network issues or server load. You can:</p>
          <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:0 auto;">
            <button onclick="window.location.reload()" style="padding:10px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
              Reload page
            </button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); document.cookie.split(';').forEach(c => document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')); window.location.href='/';" style="padding:10px 16px;background-color:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
              Clear data & restart
            </button>
            <a href="mailto:support@zarium.dev" style="padding:10px 16px;background-color:white;color:#2563eb;border:1px solid #2563eb;border-radius:6px;cursor:pointer;text-decoration:none;">
              Contact support
            </a>
          </div>
        </div>
      </div>
    `;
  }
}, 12000); // Slightly increased timeout to 12s

// Start initialization and clear the timeout when done
initializeApp().finally(() => clearTimeout(initTimeout));