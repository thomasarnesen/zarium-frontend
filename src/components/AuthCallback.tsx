// AuthCallback.tsx - Enhanced with email confirmation for Google users
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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
 
  // Helper function to detect TikTok browser
  const isTikTokBrowser = () => {
    return /TikTok/i.test(navigator.userAgent) || 
           navigator.userAgent.includes('WebView') ||
           !('cookieEnabled' in navigator) || 
           !navigator.cookieEnabled;
  };

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailInput || !emailInput.includes('@')) {
      return;
    }
    
    try {
      setIsSubmittingEmail(true);
      
      // Call API to update the email
      const response = await api.fetch('/api/update-user-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email');
      }
      
      const userData = await response.json();
      
      // Update user data
      if (tokenInfo) {
        const updatedUserData = {
          ...tokenInfo,
          email: userData.email
        };
        
        // Update auth store
        setUser(updatedUserData);
        
        // Store in local storage
        localStorage.setItem('authUser', JSON.stringify(updatedUserData));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('manualLogout'); // Clear any logout flag
        
        // Navigate based on user status
        if (tokenInfo.isNewUser) {
          console.log("Redirecting to welcome page for new user");
          navigate('/welcome');
        } else {
          console.log("Redirecting to dashboard for existing user");
          navigate('/dashboard');
        }
      }
      
      setShowEmailForm(false);
      setProcessing(false);
    } catch (error) {
      console.error('Error updating email:', error);
      setError(`Failed to update email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Collect debug info
        const debug: DebugInfo = {
          path: location.pathname,
          search: location.search,
          hash: location.hash,
          timestamp: new Date().toISOString(),
          isTikTok: isTikTokBrowser(),
          userAgent: navigator.userAgent
        };
        setDebugInfo(debug);
        console.log("Auth callback started with URL:", 
          window.location.pathname + window.location.search + window.location.hash);

        // Check if there's an error in the hash (common with Azure AD)
        if (location.hash && location.hash.includes('error=')) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          const errorCode = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          console.error(`Authentication error: ${errorCode} - ${errorDescription}`);
          throw new Error(`Authentication failed: ${errorDescription || errorCode}`);
        }
        
        // Extract token from hash (Azure AD uses fragment/hash)
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
        
        // Check for special case: auth_success=true but no token (TikTok browser)
        const isAuthSuccess = new URLSearchParams(location.search).get('auth_success') === 'true';
        
        if (!token && isAuthSuccess) {
          console.log("TikTok browser special case detected: auth_success=true but no token");
          
          // In TikTok browser, we'd use session storage or special endpoint to get the auth data
          const sessionAuthData = sessionStorage.getItem('auth_pending_data');
          const sessionProvider = sessionStorage.getItem('auth_provider');
          
          if (sessionAuthData && sessionProvider) {
            try {
              const parsedData = JSON.parse(sessionAuthData);
              if (parsedData.id_token) {
                token = parsedData.id_token;
                provider = sessionProvider;
                console.log(`Successfully retrieved token from session storage for ${provider}`);
              }
            } catch (e) {
              console.error("Failed to parse session auth data:", e);
            }
          }
          
          // If we still don't have a token, try to fetch from special endpoint
          if (!token) {
            try {
              const sessionId = sessionStorage.getItem('auth_session_id');
              if (sessionId) {
                console.log(`Attempting to retrieve auth data from session helper with ID: ${sessionId}`);
                const sessionResponse = await fetch(`/api/auth/session-helper?session_id=${sessionId}`);
                
                if (sessionResponse.ok) {
                  const sessionData = await sessionResponse.json();
                  if (sessionData.token) {
                    token = sessionData.token;
                    provider = sessionData.provider || 'azure';
                    console.log(`Successfully retrieved token from session helper for ${provider}`);
                  }
                } else {
                  console.error("Failed to retrieve auth data from session helper:", await sessionResponse.text());
                }
              }
            } catch (sessionError) {
              console.error("Error fetching from session helper:", sessionError);
            }
          }
        }
        
        // Final check if we have a token
        if (!token) {
          throw new Error('No authentication token found. Authentication failed.');
        }
        
        // For security, remove token from URL history
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Extract user info for logging (optional)
        let userEmail = null;
        let idp = null;
        
        if (token && provider === 'azure') {
          try {
            // Try to decode the token payload
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = parts[1];
              const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
              const tokenData = JSON.parse(decodedPayload);
              
              // Log tokenData for debugging (exclude sensitive fields)
              const displayData = { ...tokenData };
              delete displayData.sub;
              delete displayData.oid;
              console.log("Token data:", displayData);
              
              userEmail = tokenData.email || 
                        tokenData.preferred_username || 
                        tokenData.upn || 
                        tokenData.name;
                        
              idp = tokenData.idp;
              
              console.log("Extracted email from token:", userEmail);
              console.log("Identity provider:", idp);
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
          create_demo: true, // Always create a demo account
          isTikTok: isTikTokBrowser() // Let backend know if this is TikTok browser
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
        
        // Check if we need email confirmation (Google users)
        if (idp === 'google.com' && (!userData.email || userData.email.includes('@zarium.dev'))) {
          console.log("Google user needs email confirmation");
          setTokenInfo(userData);
          setShowEmailForm(true);
          return; // Stop processing until email is provided
        }
        
        // Store in local storage
        localStorage.setItem('authUser', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.removeItem('manualLogout'); // Clear any logout flag
        
        // Clean up any session storage items we might have used
        sessionStorage.removeItem('auth_pending_data');
        sessionStorage.removeItem('auth_provider');
        sessionStorage.removeItem('auth_session_id');
        
        // Update auth store
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
 
  if (showEmailForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
            Complete Your Registration
          </h2>
          <p className="text-emerald-700 dark:text-emerald-300 mb-6">
            Please provide your email address to complete your account setup:
          </p>
          
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isSubmittingEmail || !emailInput.includes('@')}
              className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isSubmittingEmail ? "Processing..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    );
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