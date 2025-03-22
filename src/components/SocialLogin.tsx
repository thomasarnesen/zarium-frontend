import React from 'react';
import { config } from '../config';

interface SocialLoginProps {
  mode?: 'login' | 'register';
  onLoginStart?: () => void;
  onLoginError?: (error: Error) => void;
}

const SocialLogin: React.FC<SocialLoginProps> = ({
  mode = 'login',
  onLoginStart,
  onLoginError
}) => {
  // Helper function to detect TikTok browser
  const isTikTokBrowser = () => {
    return /TikTok/i.test(navigator.userAgent) || 
           navigator.userAgent.includes('WebView') ||
           !('cookieEnabled' in navigator) || 
           !navigator.cookieEnabled;
  };

  const handleAzureLogin = () => {
    try {
      if (onLoginStart) onLoginStart();
      
      // Save current page to session storage for potential redirect after login
      sessionStorage.setItem('authRedirectUrl', window.location.pathname);
      
      const redirectUri = `${window.location.origin}/auth/callback`;
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const state = new Date().getTime().toString();
      
      // For TikTok browser special handling
      if (isTikTokBrowser()) {
        sessionStorage.setItem('auth_pending', 'true');
        sessionStorage.setItem('auth_provider', 'azure');
        
        // Use a special endpoint that will handle the session-based approach
        const tikTokFriendlyUrl = `${window.location.origin}/api/auth/azure-login?tiktok=true`;
        console.log(`Redirecting to Azure login with TikTok compatibility: ${tikTokFriendlyUrl}`);
        window.location.href = tikTokFriendlyUrl;
        return;
      }
      
      // Azure CIAM authentication URL
      const authUrl = `https://zariumai.ciamlogin.com/zariumai.onmicrosoft.com/oauth2/v2.0/authorize`;
      
      const params = new URLSearchParams({
        client_id: 'a0432355-cca6-450f-b415-a4c3c4e5d55b',
        response_type: 'id_token',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        response_mode: 'fragment',
        nonce: nonce,
        state: state,
        prompt: 'login'
      });
      
      console.log(`Redirecting to Azure login with params: ${params.toString()}`);
      window.location.href = `${authUrl}?${params.toString()}`;
    } catch (error) {
      console.error(`Error during Azure login:`, error);
      if (onLoginError) onLoginError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            Or {mode === 'register' ? 'register' : 'sign in'} with
          </span>
        </div>
      </div>
     
      <div className="mt-6 grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={handleAzureLogin}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <span className="sr-only">{mode === 'register' ? 'Register' : 'Sign in'} with Microsoft</span>
          <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path d="M0 0h11.5v11.5h-11.5zM12.5 0h11.5v11.5h-11.5zM0 12.5h11.5v11.5h-11.5zM12.5 12.5h11.5v11.5h-11.5z" />
          </svg>
          <span className="ml-2">Continue with Microsoft</span>
        </button>
      </div>
    </div>
  );
};

export default SocialLogin;