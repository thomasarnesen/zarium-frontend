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
        const debugInfo: DebugInfo = {
          path: location.pathname,
          search: location.search,
          hash: location.hash,
          timestamp: new Date().toISOString()
        };
        
        console.log("Auth callback debug info:", debugInfo);
        setDebug(debugInfo);
        
        // Try to get token from URL params (query string)
        const searchParams = new URLSearchParams(location.search);
        let token = searchParams.get('id_token');
        const code = searchParams.get('code');
        
        // If not in query params, try hash fragment
        if (!token && location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          token = hashParams.get('id_token');
        }
        
        // Collect all potentially useful data
        const authData: any = {};
        if (token) authData.id_token = token;
        if (code) authData.code = code;
        
        // Add all other params from URL for debugging
        searchParams.forEach((value, key) => {
          if (key !== 'id_token' && key !== 'code') {
            authData[key] = value;
          }
        });
        
        debugInfo.authData = authData;
        console.log("Collected auth data:", authData);
        setDebug(prevDebug => ({...prevDebug, authData})); // Fix for prev error
        
        // Only proceed if we have some form of token
        if (token || code) {
          console.log("Sending auth data to backend...");
          
          // Send to backend
          const response = await api.fetch('/api/auth/azure-callback', {
            method: 'POST',
            body: JSON.stringify(authData),
          });
          
          debugInfo.backendResponse = {
            status: response.status,
            ok: response.ok
          };
          
          if (!response.ok) {
            let errorText = '';
            try {
              const errorData = await response.json();
              errorText = errorData.error || 'Unknown error';
              debugInfo.backendResponse.error = errorData;
            } catch (e) {
              errorText = await response.text();
              debugInfo.backendResponse.error = errorText;
            }
            
            throw new Error(`Authentication failed: ${errorText}`);
          }
          
          // Parse user data from response
          const userData = await response.json();
          debugInfo.userData = {
            received: true,
            isNewUser: userData.isNewUser,
            email: userData.email
          };
          
          console.log("Received user data:", userData);
          
          // Store in local storage
          localStorage.setItem('authUser', JSON.stringify(userData));
          localStorage.setItem('isAuthenticated', 'true');
          setUser(userData);
          
          // Navigate based on user status
          if (userData.isNewUser) {
            navigate('/welcome');
          } else {
            navigate('/dashboard');
          }
          return;
        }
        
        // Try /.auth/me as fallback (for Static Web Apps auth)
        try {
          console.log("No token found in URL, trying /.auth/me");
          const clientPrincipal = await getClientPrincipal();
          debugInfo.clientPrincipal = clientPrincipal ? {found: true} : {found: false};
          
          if (clientPrincipal && (clientPrincipal.userDetails || clientPrincipal.userId)) {
            console.log("Found client principal, processing...");
            
            const response = await api.fetch('/api/auth/azure-callback', {
              method: 'POST',
              body: JSON.stringify({
                id_token: JSON.stringify(clientPrincipal),
                user_details: clientPrincipal.userDetails,
                user_id: clientPrincipal.userId
              }),
            });
            
            if (!response.ok) {
              throw new Error('Authentication failed via client principal');
            }
            
            const userData = await response.json();
            localStorage.setItem('authUser', JSON.stringify(userData));
            localStorage.setItem('isAuthenticated', 'true');
            setUser(userData);
            
            if (userData.isNewUser) {
              navigate('/welcome');
            } else {
              navigate('/dashboard');
            }
            return;
          }
        } catch (error) { // Fix for clientPrincipalError
          // Type assertion for the error
          const clientPrincipalError = error as Error;
          console.warn("Error with client principal:", clientPrincipalError);
          debugInfo.clientPrincipalError = clientPrincipalError.message;
        }
        
        // No auth data found anywhere
        setError('No authentication data found. Please try logging in again.');
        console.error("No authentication data found");
        setDebug(prevDebug => ({...prevDebug, noAuthDataFound: true})); // Fix for prev error
        
      } catch (error) {
        console.error('Auth callback error:', error);
        const finalError = error instanceof Error ? error.message : String(error);
        setError(`Authentication error: ${finalError}`);
        setDebug(prevDebug => ({...prevDebug, finalError})); // Fix for prev error
      }
    };
    
    processAuthCallback();
  }, [location, navigate, setUser]);
 
  // Function to get clientPrincipal from /.auth/me endpoint
  const getClientPrincipal = async () => {
    try {
      const response = await fetch('/.auth/me');
      if (!response.ok) {
        throw new Error('Failed to get authentication data');
      }
      
      const data = await response.json();
      return data.clientPrincipal;
    } catch (error) {
      console.error('Error fetching auth data:', error);
      return null;
    }
  };
 
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