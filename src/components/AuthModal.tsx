import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const AuthCallback = () => {
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
 
  useEffect(() => {
    const processAuthCallback = async () => {
      try {
        // Get authentication data from either query params or client principal
        const searchParams = new URLSearchParams(location.search);
        const idToken = searchParams.get('id_token');
        let authData;
        
        if (idToken) {
          // Token from URL parameter
          authData = { id_token: idToken };
        } else {
          // Try to get from client principal
          const clientPrincipal = await getClientPrincipal();
          if (!clientPrincipal) {
            throw new Error('No authentication data found');
          }
          authData = {
            id_token: JSON.stringify(clientPrincipal),
            user_details: clientPrincipal.userDetails,
            user_id: clientPrincipal.userId
          };
        }
        
        // Send auth data to backend
        const response = await api.fetch('/api/auth/azure-callback', {
          method: 'POST',
          body: JSON.stringify(authData),
        });
         
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Authentication failed');
        }
         
        const userData = await response.json();
        const isFirstTimeUser = userData.isNewUser;
        setIsNewUser(isFirstTimeUser);
         
        // Save user data and update state
        localStorage.setItem('authUser', JSON.stringify(userData));
        localStorage.setItem('isAuthenticated', 'true');
        setUser(userData);
         
        // Redirect based on whether this is a new user
        if (isFirstTimeUser) {
          // If new user, redirect to welcome/onboarding page
          navigate('/welcome');
        } else {
          // If existing user, go to dashboard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => navigate('/login'), 3000);
      }
    };
   
    processAuthCallback();
  }, [location, navigate, setUser]);
 
  // Function to get clientPrincipal from /.auth/me endpoint
  const getClientPrincipal = async () => {
    try {
      const response = await fetch('/.auth/me');
      if (!response.ok) {
        return null;
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
          {isNewUser ? 'Creating your account...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;