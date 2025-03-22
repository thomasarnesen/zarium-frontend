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
        
        // Get token from URL parameters
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('id_token') || searchParams.get('code');
        const userDetails = searchParams.get('user_details'); 
        const userId = searchParams.get('user_id');
        const provider = searchParams.get('provider') || determineProvider();
        const isNewUser = searchParams.get('isNewUser') === 'true';
        
        // Logging for debugging
        console.log(`Auth provider detected: ${provider}`);
        
        // Collect auth data
        const authData: any = {
          id_token: token,
          user_details: userDetails,
          user_id: userId,
          provider: provider
        };
        
        debugInfo.authData = authData;
        console.log("Collected auth data:", authData);
        setDebug(prevDebug => ({...prevDebug, authData}));
        
        if (!token) {
          throw new Error('No authentication token found in URL');
        }

        // Handle token directly if it appears to be a complete JWT
        if (token && 
            token.split('.').length === 3 && 
            authData.user_details && 
            authData.user_id) {
          try {
            // This looks like a pre-validated token from B2C
            console.log("Direct token handling - bypassing backend validation");
            
            // Parse token data if possible
            const tokenParts = token.split('.');
            const tokenPayload = JSON.parse(atob(tokenParts[1]));
            
            const userData = {
              id: tokenPayload.sub || parseInt(authData.user_id) || 0,
              email: authData.user_details || tokenPayload.email,
              planType: tokenPayload.plan_type || 'Demo',
              tokens: tokenPayload.tokens || 0,
              token: token,
              isNewUser: isNewUser
            };
            
            // Store authentication data
            localStorage.setItem('authUser', JSON.stringify(userData));
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.removeItem('manualLogout');
            setUser(userData);
            
            // Remove token from URL (for security)
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Navigate based on user status
            if (userData.isNewUser || isNewUser) {
              console.log("Redirecting to welcome page for new user");
              navigate('/welcome');
            } else {
              console.log("Redirecting to dashboard for existing user");
              navigate('/dashboard');
            }
            
            setProcessing(false);
            return;
          } catch (parseError) {
            console.warn("Failed to process token directly, falling back to backend validation", parseError);
            // Continue with backend validation
          }
        }
        
        // Choose the right endpoint based on the provider
        const callbackEndpoint = 
          provider === 'google' 
            ? '/api/auth/google/callback' 
            : '/api/auth/azure-callback';
        
        console.log(`Using callback endpoint: ${callbackEndpoint}`);
            
        // Token exists - send to backend to create session
        console.log("Sending auth data to backend for session creation");
        
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
            isNewUser: userData.isNewUser || isNewUser,
            email: userData.email
          };
          
          console.log("Received user data:", userData);
          
          // Store in local storage
          localStorage.setItem('authUser', JSON.stringify(userData));
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.removeItem('manualLogout'); // Clear any logout flag
          setUser(userData);
          
          // Remove token from URL (for security)
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Get saved redirect URL if it exists
          const redirectUrl = sessionStorage.getItem('authRedirectUrl');
          sessionStorage.removeItem('authRedirectUrl');
          
          // Navigate based on user status
          if (userData.isNewUser || isNewUser) {
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
        
        setProcessing(false);
      } catch (error) {
        console.error('Auth callback error:', error);
        const finalError = error instanceof Error ? error.message : String(error);
        setError(`Authentication error: ${finalError}`);
        setDebug(prevDebug => ({...prevDebug, finalError}));
        setProcessing(false);
        
        // Redirect to login after a delay
        setTimeout(() => navigate('/login'), 5000);
      }
    };
    
    processAuthCallback();
  }, [location, navigate, setUser]);
  
  // Helper function to determine the provider from the URL
  function determineProvider() {
    const searchParams = new URLSearchParams(location.search);
    
    // Check if this might be Google (code param is typically from Google)
    if (searchParams.has('code') && !searchParams.has('provider')) {
      return 'google';
    }
    
    // Check URL path for clues
    if (location.pathname.includes('google')) {
      return 'google';
    }
    
    // Check if the token looks like a Google token (from the user_id format)
    const userId = searchParams.get('user_id');
    if (userId && /^\d+$/.test(userId) && userId.length > 15) {
      return 'google';
    }
    
    // Default to Azure if can't determine
    return 'azure';
  }
 
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Redirecting to login page in a few seconds...</p>
            
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
        <p className="text-gray-600 dark:text-gray-300">
          {processing ? "Completing sign in..." : "Authentication complete, redirecting..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;