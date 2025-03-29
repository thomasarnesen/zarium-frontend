import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore(); // Add this to directly use your auth store

  // Process the token from the URL
  useEffect(() => {
    const processToken = async (): Promise<void> => {
      try {
        // Add debug info
        setDebugInfo(prev => prev + "Starting auth process...\n");
        console.log("Auth callback started with URL:", location.pathname + location.search + location.hash);
        
        // Check if we have a hash with an id_token
        if (location.hash && location.hash.includes('id_token=')) {
          setDebugInfo(prev => prev + "Found token in URL hash\n");
          console.log("Found hash in URL");
          
          // Extract the token from the hash
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const idToken = hashParams.get('id_token');
          
          if (idToken) {
            setDebugInfo(prev => prev + "Successfully extracted token\n");
            console.log("Successfully extracted token from hash");
            
            // Call your API endpoint to process the token and authenticate the user
            try {
              setDebugInfo(prev => prev + "Sending token to API...\n");
              const response = await fetch('/api/auth/azure-callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({ id_token: idToken }),
                credentials: 'include'
              });
              
              setDebugInfo(prev => prev + `API response status: ${response.status}\n`);
              
              if (!response.ok) {
                const errorText = await response.text();
                console.error('Auth callback API error:', response.status, errorText);
                setDebugInfo(prev => prev + `API error: ${response.status} - ${errorText}\n`);
                throw new Error(`Failed to authenticate: ${response.status}`);
              }
              
              const data = await response.json();
              setDebugInfo(prev => prev + "Authentication successful\n");
              console.log("Authentication successful, redirecting");
              console.log("User data received:", data);
              
              // Important: update your auth store directly
              if (data && data.token) {
                setDebugInfo(prev => prev + "Setting user in auth store\n");
                setUser(data);
                
                // Save to localStorage as a backup
                try {
                  const authUser = { ...data };
                  localStorage.setItem('authUser', JSON.stringify(authUser));
                  localStorage.setItem('isAuthenticated', 'true');
                  localStorage.removeItem('manualLogout'); // Clear any previous logout flag
                  console.log("Saved auth data to localStorage");
                  setDebugInfo(prev => prev + "Saved auth data to localStorage\n");
                } catch (storageErr) {
                  console.error('Error saving to localStorage:', storageErr);
                  setDebugInfo(prev => prev + `localStorage error: ${storageErr}\n`);
                }
                
                // Decide where to redirect
                if (!data.displayName || data.displayName === 'unknown') {
                  setDebugInfo(prev => prev + "Redirecting to welcome page\n");
                  navigate('/welcome');
                } else {
                  setDebugInfo(prev => prev + "Redirecting to dashboard\n");
                  navigate('/dashboard');
                }
              } else {
                setDebugInfo(prev => prev + "No token in response data\n");
                throw new Error('No token received from server');
              }
            } catch (apiError: any) {
              setDebugInfo(prev => prev + `API call error: ${apiError.message}\n`);
              throw apiError;
            }
          } else {
            setDebugInfo(prev => prev + "No token found in URL\n");
            throw new Error('No token found in URL');
          }
        } else {
          setDebugInfo(prev => prev + "Invalid callback URL - no token found\n");
          throw new Error('Invalid callback URL - no token found');
        }
      } catch (error: any) {
        console.error("Error processing auth callback:", error);
        setDebugInfo(prev => prev + `Final error: ${error.message}\n`);
        setError(error.message || "Authentication failed. Please try again.");
        setLoading(false);
      }
    };
    
    processToken();
  }, [location, navigate, setUser]);

  // If there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Authentication Error</h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            
            {debugInfo && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left overflow-auto max-h-60">
                <p className="text-xs font-mono whitespace-pre-wrap">{debugInfo}</p>
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state - show this during token processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Processing Authentication</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Please wait while we complete your login...</p>
          
          {debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left overflow-auto max-h-60">
              <p className="text-xs font-mono whitespace-pre-wrap">{debugInfo}</p>
            </div>
          )}
          
          <div className="mt-4 flex justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;