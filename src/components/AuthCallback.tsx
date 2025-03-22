import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

// Interface for debug info
interface DebugInfo {
  path?: string;
  search?: string;
  hash?: string;
  timestamp?: string;
  authData?: any;
  backendResponse?: any;
  finalError?: string;
  userData?: any;
  [key: string]: any; 
}

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<DebugInfo>({}); 
  const [processing, setProcessing] = useState(true);
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
        
        // IMPORTANT: Check both URL hash and search parameters for the token
        // B2C typically returns tokens in the URL hash fragment
        let token = null;
        let provider = 'azure';
        
        // Check URL hash for id_token (this is how Azure B2C returns the token)
        if (location.hash) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          token = hashParams.get('id_token');
          if (token) {
            console.log("Found token in URL hash fragment");
          }
        }
        
        // If not in hash, check search params (for other providers)
        if (!token && location.search) {
          const searchParams = new URLSearchParams(location.search);
          token = searchParams.get('id_token') || searchParams.get('code');
          if (token) {
            console.log("Found token in URL search parameters");
          }
        }
        
        // Determine the provider (google or azure)
        if (location.search && location.search.includes('provider=google')) {
          provider = 'google';
        }
        
        // When we have a token, process it
        if (token) {
          console.log(`Processing ${provider} authentication token`);
          
          // For security, remove token from URL history
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Extract user info from token for Azure B2C (if possible)
          let userDetails = null;
          let userId = null;
          
          try {
            // Try to decode the token payload
            const payload = token.split('.')[1];
            const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            const tokenData = JSON.parse(decodedPayload);
            
            // Extract claims from the token
            userDetails = tokenData.email || tokenData.emails?.[0] || tokenData.name;
            userId = tokenData.sub || tokenData.oid;
            
            console.log("Extracted user details from token:", userDetails);
          } catch (decodeError) {
            console.warn("Could not decode token payload:", decodeError);
          }
          
          // Construct auth data for the backend
          const authData = {
            id_token: token,
            user_details: userDetails,
            user_id: userId,
            provider: provider,
            create_demo: true  // Always create a demo account
          };
          
          debugInfo.authData = authData;
          console.log("Auth data prepared:", authData);
          setDebug(prevDebug => ({...prevDebug, authData}));
          
          // Choose the right endpoint based on the provider
          const callbackEndpoint = 
            provider === 'google' 
              ? '/api/auth/google/callback' 
              : '/api/auth/azure-callback';
          
          console.log(`Using callback endpoint: ${callbackEndpoint}`);
              
          // Set timeout for fetch to avoid hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            const response = await api.fetch(callbackEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(authData),
              credentials: 'include',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
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
              email: userData.email,
              planType: userData.planType
            };
            
            console.log("Received user data:", userData);
            
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
          } catch (fetchError: unknown) {
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              throw new Error('Network request timed out. Please check your connection and try again.');
            } else {
              throw fetchError;
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } else {
          throw new Error('No authentication token found in URL');
        }
        
        setProcessing(false);
      } catch (error) {
        console.error('Auth callback error:', error);
        const finalError = error instanceof Error ? error.message : String(error);
        setError(`Authentication error: ${finalError}`);
        setDebug(prevDebug => ({...prevDebug, finalError}));
        setProcessing(false);
        
        // Redirect to homepage after a delay
        setTimeout(() => navigate('/'), 5000);
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
                {JSON.stringify(debug, null, 2)}
              </pre>
              
              <div className="mt-4 flex space-x-4 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
          {processing ? "Completing sign in..." : "Authentication complete, redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;