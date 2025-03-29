import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthData {
  id: number;
  email: string;
  token: string;
  planType: string;
  tokens: number;
  displayName?: string;
  isNewUser?: boolean;
  needsDisplayName?: boolean;
}

const AuthCallback: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Process the token from the URL
  useEffect(() => {
    const processToken = async (): Promise<void> => {
      try {
        console.log("Auth callback started with URL:", location.pathname + location.search + location.hash);
        
        // Check if we have a hash with an id_token
        if (location.hash && location.hash.includes('id_token=')) {
          console.log("Found hash in URL");
          
          // Extract the token from the hash
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const idToken = hashParams.get('id_token');
          
          if (idToken) {
            console.log("Successfully extracted token from hash");
            
            // Call your API endpoint to process the token and authenticate the user
            const response = await fetch('/api/auth/azure-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ id_token: idToken }),
              credentials: 'include'
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('Auth callback API error:', response.status, errorText);
              throw new Error(`Failed to authenticate: ${response.status}`);
            }
            
            const data = await response.json() as AuthData;
            console.log("Authentication successful, redirecting");
            
            // Save to local storage if needed (this should match your current implementation)
            try {
              if (data.token) {
                const authUser = {
                  id: data.id,
                  email: data.email,
                  token: data.token,
                  planType: data.planType,
                  tokens: data.tokens,
                  displayName: data.displayName || ''
                };
                localStorage.setItem('authUser', JSON.stringify(authUser));
                localStorage.setItem('isAuthenticated', 'true');
                console.log("Saved auth data to localStorage");
              }
            } catch (storageErr) {
              console.error('Error saving to localStorage:', storageErr);
            }
            
            // Redirect based on whether a display name is needed
            const needsDisplayName = !data.displayName || data.displayName === 'unknown';
            if (needsDisplayName) {
              navigate('/welcome');
            } else {
              navigate('/dashboard');
            }
          } else {
            throw new Error('No token found in URL');
          }
        } else {
          throw new Error('Invalid callback URL - no token found');
        }
      } catch (error: any) {
        console.error("Error processing auth callback:", error);
        setError(error.message || "Authentication failed. Please try again.");
        setLoading(false);
      }
    };
    
    processToken();
  }, [location, navigate]);

  // If there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Authentication Error</h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
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
          <div className="mt-4 flex justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;