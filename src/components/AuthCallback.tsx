// src/components/AuthCallback.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

// Create a type for the debug state
interface DebugInfo {
  path?: string;
  search?: string;
  hash?: string;
  timestamp?: string;
  authData?: any;
  backendResponse?: any;
  clientPrincipal?: any;
  noAuthDataFound?: boolean;
  finalError?: string;
  clientPrincipalError?: string;
  userData?: any;
  [key: string]: any; // Allow additional properties
}

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo>({}); // Use the interface
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
 
  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Debug info
        const debugInfo = {
          path: location.pathname,
          search: location.search,
          hash: location.hash,
          timestamp: new Date().toISOString()
        };
        
        console.log("Auth callback debug info:", debugInfo);
        setDebug(debugInfo);
        
        // Get token from various sources
        const searchParams = new URLSearchParams(location.search);
        let token = searchParams.get('id_token');
        const code = searchParams.get('code');
        const provider = searchParams.get('provider') || 'unknown';
        
        // If not in query params, try hash fragment (implicit flow)
        if (!token && location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          token = hashParams.get('id_token');
        }
        
        // Collect auth data
        const authData: any = {
          provider: provider
        };
        
        if (token) authData.id_token = token;
        if (code) authData.code = code;
        
        // Only proceed if we have a token or code
        if (token || code) {
          console.log(`Processing ${provider} authentication...`);
          
          // Send to backend
          const response = await api.fetch('/api/auth/azure-callback', {
            method: 'POST',
            body: JSON.stringify(authData),
          });
          
          if (!response.ok) {
            throw new Error(`Authentication failed with status ${response.status}`);
          }
          
          // Process user data
          const userData = await response.json();
          
          // Store in local storage and state
          localStorage.setItem('authUser', JSON.stringify(userData));
          localStorage.setItem('isAuthenticated', 'true');
          setUser(userData);
          
          // Navigate based on user status
          const redirectUrl = sessionStorage.getItem('authRedirectUrl') || '/dashboard';
          sessionStorage.removeItem('authRedirectUrl');
          
          if (userData.isNewUser) {
            navigate('/welcome');
          } else {
            navigate(redirectUrl);
          }
        } else {
          throw new Error('No authentication token found');
        }
      } catch (error) {
        console.error('Auth processing error:', error);
        setError(`Authentication error: ${error instanceof Error ? error.message : String(error)}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    };
    
    processAuthCallback();
  }, [location, navigate, setUser]);
 
// Either remove the unused function or use it in the component
// For example, in the useEffect:

// Rest of the component remains the same...
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            
            {/* Add debugging information */}
            <div className="mt-6 text-left text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
              <h3 className="font-semibold">Debug Info:</h3>
              <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto text-xs">
                {JSON.stringify(debug, null, 2)}
              </pre>
              
              <div className="mt-4 flex space-x-4 justify-center">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Back to Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Completing sign in...</p>
        
        {/* Show minimal debug info even on loading state */}
        <div className="mt-8 text-left text-xs text-gray-400">
          <p>Path: {location.pathname}</p>
          <p>Has search params: {location.search ? 'Yes' : 'No'}</p>
          <p>Has hash params: {location.hash ? 'Yes' : 'No'}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;