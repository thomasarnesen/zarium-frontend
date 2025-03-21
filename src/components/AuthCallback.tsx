// src/components/AuthCallback.tsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
 
  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        setIsProcessing(true);
        console.log("Processing auth callback on path:", location.pathname);
        console.log("URL search params:", location.search);
        
        // Extract token from URL params (B2C sends it here)
        const urlParams = new URLSearchParams(location.search);
        const idToken = urlParams.get('id_token');
        const code = urlParams.get('code');
        
        // Also check hash parameters (some auth flows use these)
        let hashToken = null;
        if (location.hash && location.hash.length > 1) {
          const hashParams = new URLSearchParams(location.hash.substring(1));
          hashToken = hashParams.get('id_token');
        }
        
        // Use whichever token we found
        const token = idToken || hashToken || code;
        
        if (token) {
          console.log("Found token in URL, sending to backend");
          
          // Send token to backend
          const response = await api.fetch('/api/auth/azure-callback', {
            method: 'POST',
            body: JSON.stringify({
              id_token: token,
              // Include code if available
              code: code || undefined
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Authentication failed');
          }
          
          const userData = await response.json();
          
          // Check if this is a new user for potential different redirect
          const isNewUser = userData.isNewUser;
          
          // Save user data
          localStorage.setItem('authUser', JSON.stringify(userData));
          localStorage.setItem('isAuthenticated', 'true');
          setUser(userData);
          
          // Redirect based on whether this is a new user
          if (isNewUser) {
            navigate('/welcome');
          } else {
            navigate('/dashboard');
          }
          
          return;
        }
        
        // If no token in URL, try the /.auth/me endpoint
        try {
          const clientPrincipal = await getClientPrincipal();
          
          if (clientPrincipal && (clientPrincipal.userDetails || clientPrincipal.userId)) {
            console.log("Found client principal data:", clientPrincipal);
            
            const response = await api.fetch('/api/auth/azure-callback', {
              method: 'POST',
              body: JSON.stringify({
                id_token: JSON.stringify(clientPrincipal),
                user_details: clientPrincipal.userDetails,
                user_id: clientPrincipal.userId
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || 'Authentication failed');
            }
            
            const userData = await response.json();
            
            // Check if this is a new user
            const isNewUser = userData.isNewUser;
            
            // Save user data
            localStorage.setItem('authUser', JSON.stringify(userData));
            localStorage.setItem('isAuthenticated', 'true');
            setUser(userData);
            
            // Redirect based on whether this is a new user
            if (isNewUser) {
              navigate('/welcome');
            } else {
              navigate('/dashboard');
            }
            
            return;
          }
        } catch (clientPrincipalError) {
          console.warn("Error fetching client principal:", clientPrincipalError);
          // Continue with error handling below
        }
        
        // No authentication data found
        setError('No authentication data found. Please try logging in again.');
        setTimeout(() => navigate('/login'), 3000);
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setIsProcessing(false);
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
 
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Redirecting to login...</p>
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
          {isProcessing ? "Processing authentication..." : "Completing sign in..."}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;