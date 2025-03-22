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
  const handleSocialLogin = async (provider: string) => {
    try {
      if (onLoginStart) onLoginStart();
      
      // Save current page to session storage for potential redirect after login
      sessionStorage.setItem('authRedirectUrl', window.location.pathname);
      
      // Use frontend URL instead of backend
      const apiUrl = `${window.location.origin}/api/auth/${provider}/login?mode=${mode}`;
      console.log(`Redirecting to ${provider} login: ${apiUrl}`);
      
      // Navigate to our frontend OAuth login endpoint (will be proxied to backend)
      window.location.href = apiUrl;
    } catch (error) {
      console.error(`Error during ${provider} ${mode}:`, error);
      if (onLoginError) onLoginError(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Add this to your SocialLoginChoice component
  const handleMicrosoftLogin = () => {
    try {
      if (onLoginStart) onLoginStart();
      
      // Save current page to session storage for potential redirect after login
      sessionStorage.setItem('authRedirectUrl', window.location.pathname);
      
      const redirectUri = `${window.location.origin}/auth/callback`;
      const nonce = Math.floor(Math.random() * 1000000).toString();
      
      // Build the URL with EXACT parameters
      const b2cBaseUrl = "https://zarium.b2clogin.com/zarium.onmicrosoft.com/B2C_1_signup_signin/oauth2/v2.0/authorize";
      const params = new URLSearchParams({
        client_id: "279cccfd-a2d6-4149-90d2-311cf5db1f35",
        response_type: "id_token",
        redirect_uri: redirectUri,
        scope: "openid profile email",
        response_mode: "fragment", // CRITICAL - ensures token comes in URL hash
        nonce: nonce,
        state: new Date().getTime().toString()
      });
      
      console.log(`Redirecting to Microsoft login with params: ${params.toString()}`);
      window.location.href = `${b2cBaseUrl}?${params.toString()}`;
    } catch (error) {
      console.error(`Error during Microsoft ${mode}:`, error);
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
     
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <span className="sr-only">{mode === 'register' ? 'Register' : 'Sign in'} with Google</span>
          <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
          </svg>
        </button>
       
        <button
          type="button"
          onClick={handleMicrosoftLogin}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <span className="sr-only">{mode === 'register' ? 'Register' : 'Sign in'} with Microsoft</span>
          <svg className="h-5 w-5" aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
            <path d="M0 0h11.5v11.5h-11.5zM12.5 0h11.5v11.5h-11.5zM0 12.5h11.5v11.5h-11.5zM12.5 12.5h11.5v11.5h-11.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SocialLogin;