import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, FileSpreadsheet } from 'lucide-react';
import UserMenu from './UserMenu';
import { useState } from 'react';
import  RecaptchaService  from '../utils/recaptchaService';
import { toast } from 'react-hot-toast'; // Make sure you have this package installed

export default function Navbar() {
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  // Updated to use reCAPTCHA before redirecting to Azure
  const handleDirectAuth = async () => {
    try {
      setIsAuthLoading(true);
      
      // Execute reCAPTCHA verification
      const recaptchaToken = await RecaptchaService.safeExecuteRecaptcha('login_navbar');
      
      // Special handling for unavailable reCAPTCHA
      if (recaptchaToken === 'recaptcha-unavailable' || recaptchaToken === 'recaptcha-error') {
        console.warn(`reCAPTCHA issue: ${recaptchaToken}, proceeding with auth anyway`);
        // You could choose to block auth here, but we'll allow it with a warning
      } else {
        // Verify the token with your backend
        const verifyResponse = await RecaptchaService.verifyToken(recaptchaToken);
        
        if (!verifyResponse.success) {
          toast.error('Security verification failed. Please try again.');
          setIsAuthLoading(false);
          return;
        }
        
        // If score is very low, you might want to block
        if (verifyResponse.score && verifyResponse.score < 0.2) {
          toast.error('Suspicious activity detected. Please try again later.');
          setIsAuthLoading(false);
          return;
        }
      }
      
      // Proceed with external authentication redirect
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      // Store the current path for potential redirect after login
      sessionStorage.setItem('authRedirectUrl', window.location.pathname);
      
      // Generate nonce for security
      const nonce = Date.now().toString();
      const state = Math.random().toString(36).substring(2, 15);
      
      // Azure CIAM authorization URL
      const authUrl = `https://zariumai.ciamlogin.com/zariumai.onmicrosoft.com/oauth2/v2.0/authorize`;
      
      const params = new URLSearchParams({
        client_id: 'a0432355-cca6-450f-b415-a4c3c4e5d55b',
        response_type: 'id_token',
        redirect_uri: redirectUrl,
        scope: 'openid profile email',
        response_mode: 'fragment',
        nonce: nonce,
        state: state,
        prompt: 'login'
      });
      
      // Redirect to Azure CIAM login page
      window.location.href = `${authUrl}?${params.toString()}`;
      
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('Could not start login process. Please try again.');
      setIsAuthLoading(false);
    }
  };

  return (
    <nav className="bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 border-b border-emerald-100 dark:border-emerald-900 sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          <Link to="/" className="flex items-center">
            <div className="text-emerald-900 dark:text-emerald-100 flex items-center hover:opacity-90 transition-opacity">
              <div className="font-sans text-3xl font-bold tracking-tight flex items-center">
                <span className="relative flex items-baseline logo-text">
                  <span className="inline-block logo-letter">Z</span>
                  <span className="logo-word">arium</span>
                </span>
              </div>
            </div>
          </Link>
          <div className="flex items-center space-x-8">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  Dashboard
                </Link>
                {/* Only show Pricing to authenticated users */}
                <Link
                  to="/pricing"
                  className="text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  Pricing
                </Link>
                <UserMenu />
              </>
            ) : (
              <>
                {/* For non-authenticated users, just show "Get Started" button */}
                <button
                  onClick={handleDirectAuth}
                  disabled={isAuthLoading}
                  className="text-base bg-emerald-800 dark:bg-emerald-700 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-900 dark:hover:bg-emerald-600 shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? 'Verifying...' : 'Sign In'}
                </button>
              </>
            )}
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 transition-all"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
