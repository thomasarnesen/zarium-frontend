import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface DebugInfo {
  timestamp?: string;
  authData?: any;
  finalError?: string;
  [key: string]: any;
}

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
 
  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Collect debug info
        const debug: DebugInfo = {
          path: location.pathname,
          search: location.search,
          hash: location.hash,
          timestamp: new Date().toISOString()
        };
        setDebugInfo(debug);
        console.log("Auth callback started with URL:", 
          window.location.pathname + window.location.search + window.location.hash);

        // Check if there's an error in the hash (common with Azure B2C)
        if (location.hash && location.hash.includes('error=')) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const errorCode = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          console.error(`Authentication error: ${errorCode} - ${errorDescription}`);
          throw new Error(`Authentication failed: ${errorDescription || errorCode}`);
        }
        
        // Extract token from hash (Azure B2C uses fragment/hash)
        let token = null;
        let provider = 'azure';
        
        if (window.location.hash && window.location.hash.length > 1) {
          console.log("Found hash in URL");
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          token = hashParams.get('id_token');
          
          if (token) {
            console.log("Successfully extracted token from hash");
          } else {
            console.error("No id_token found in hash parameters");
          }
        } else {
          console.log("No hash fragment in URL, checking search parameters");
          
          // Fall back to query parameters (for OAuth2 code flow with Google)
          const searchParams = new URLSearchParams(location.search);
          token = searchParams.get('code');
          if (token) {
            console.log("Found code in search parameters");
            provider = 'google';
          }
        }
        
        // Final check if we have a token
        if (!token) {
          throw new Error('No authentication token found in URL');
        }
        
        // For security, remove token from URL history
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Extract user info for logging (optional)
        let userEmail = null;
        if (token && provider === 'azure') {
          try {
            // Try to decode the token payload
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = parts[1];
              const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
              const tokenData = JSON.parse(decodedPayload);
              userEmail = tokenData.email || tokenData.emails?.[0] || tokenData.name;
              console.log("Extracted email from token:", userEmail);
            }
          } catch (decodeError) {
            console.warn("Could not decode token payload:", decodeError);
          }
        }
        
        // Prepare authentication data for backend
        const authData = {
          id_token: token,
          user_details: userEmail,
          user_id: null, // Will be extracted by backend
          provider: provider,
          create_demo: true  // Always create a demo account
        };
        
        debug.authData = { ...authData, id_token: '***redacted***' };
        setDebugInfo((prev: DebugInfo) => ({...prev, ...debug}));
        
        // Send token to backend for verification/user creation
        const callbackEndpoint = 
          provider === 'google' 
            ? '/api/auth/google/callback' 
            : '/api/auth/azure-callback';
        
        console.log(`Using callback endpoint: ${callbackEndpoint}`);
            
        const response = await api.fetch(callbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(authData),
          credentials: 'include'
        });
          
        if (!response.ok) {
          let errorMessage = '';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || `Error ${response.status}`;
          } catch (e) {
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }
          
        // Parse user data from response
        const userData = await response.json();
        
        // Store in local storage
        localStorage.setItem('authUser', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('manualLogout'); // Clear any logout flag
        setUser(userData);
        
        // Get saved redirect URL if it exists
        const redirectUrl = sessionStorage.getItem('authRedirectUrl');
        sessionStorage.removeItem('authRedirectUrl');
        
        // Navigate based on user status
        if (userData.isNewUser) {
          console.log("Redirecting to welcome page for new user");
          navigate('/welcome');
        } else {
          console.log("Redirecting to dashboard or saved URL for existing user");
          navigate(redirectUrl || '/dashboard');
        }
        
        setProcessing(false);
      } catch (error) {
        console.error('Auth callback error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError(`Authentication error: ${errorMessage}`);
        setDebugInfo((prev: DebugInfo) => ({...prev, finalError: errorMessage}));
        setProcessing(false);
        
        // Redirect to homepage after a delay
        setTimeout(() => navigate('/'), 8000);
      }
    };
    
    processAuthCallback();
  }, [location, navigate, setUser]);
 
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Redirecting to home page in a few seconds...</p>
            
            {/* Debug information */}
            <div className="mt-6 text-left text-sm text-gray-500 dark:text-gray-400 border-t pt-4">
              <h3 className="font-semibold">Debug Info:</h3>
              <pre className="mt-2 bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
              
              <div className="mt-4 flex space-x-4 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Back to Home
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
        <p className="text-gray-600 dark:text-gray-300">
          {processing ? "Signing you in..." : "Authentication complete, redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;