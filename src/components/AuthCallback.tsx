import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RecaptchaService } from '../utils/recaptchaService';

/**
 * This component handles the auth callback and adds reCAPTCHA v2 verification
 * before redirecting to the welcome page
 */
function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const captchaRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Step 1: Extract token from URL
  useEffect(() => {
    const extractTokenFromHash = async () => {
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
            setToken(idToken);
            
            // Call your API endpoint to process the token and authenticate the user
            const response = await fetch('/api/auth/azure-callback', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id_token: idToken }),
              credentials: 'include'
            });
            
            if (!response.ok) {
              throw new Error('Failed to authenticate');
            }
            
            const data = await response.json();
            setUserData(data);
            
            // After successfully processing the token, show the captcha
            setShowCaptcha(true);
          } else {
            throw new Error('No token found in URL');
          }
        } else {
          throw new Error('Invalid callback URL');
        }
      } catch (err) {
        console.error("Error processing auth callback:", err);
        setError("Authentication failed. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    extractTokenFromHash();
  }, [location]);

  // Step 2: Load reCAPTCHA when needed
  useEffect(() => {
    if (showCaptcha) {
      const loadCaptcha = async () => {
        try {
          await RecaptchaService.loadRecaptchaV2();
          setTimeout(() => {
            RecaptchaService.renderCaptchaV2('recaptcha-container');
          }, 100); // Short delay to ensure DOM is ready
        } catch (err) {
          console.error("Failed to load reCAPTCHA:", err);
          setError("Failed to load security verification. Please refresh and try again.");
        }
      };
      
      loadCaptcha();
    }
  }, [showCaptcha]);

  // Handle verification and proceed to welcome page
  const handleVerifyClick = async () => {
    try {
      setLoading(true);
      
      // Get reCAPTCHA response
      const captchaResponse = RecaptchaService.getRecaptchaV2Response();
      
      if (!captchaResponse) {
        setError("Please complete the security verification");
        setLoading(false);
        return;
      }
      
      // Verify captcha with backend
      const verifyResult = await RecaptchaService.verifyToken(captchaResponse);
      
      if (!verifyResult.success) {
        setError("Security verification failed. Please try again.");
        RecaptchaService.resetRecaptchaV2();
        setLoading(false);
        return;
      }
      
      // Now we can proceed to the welcome page or dashboard
      if (userData?.needsDisplayName) {
        navigate('/welcome');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("An error occurred during verification. Please try again.");
      setLoading(false);
    }
  };

  // If there's an error or we're loading
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

  // After successful token extraction, show captcha
  if (showCaptcha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <div className="text-center">
            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Security Verification</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please complete the security check to continue to your account
            </p>
            
            <div className="my-6 flex justify-center">
              <div id="recaptcha-container" ref={captchaRef}></div>
            </div>
            
            <button
              onClick={handleVerifyClick}
              disabled={loading}
              className="mt-4 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Initial loading state
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
}

export default AuthCallback;