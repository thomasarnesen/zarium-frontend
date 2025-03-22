import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, FileSpreadsheet } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Navbar() {
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  // Direct to Microsoft authentication
  const handleDirectAuth = () => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    // Store the current URL for potential redirect after login
    sessionStorage.setItem('authRedirectUrl', window.location.pathname);
    
    // Define the B2C URL with all necessary parameters
    const b2cUrl = `https://zarium.b2clogin.com/zarium.onmicrosoft.com/B2C_1_signup_signin/oauth2/v2.0/authorize?client_id=279cccfd-a2d6-4149-90d2-311cf5db1f35&response_type=id_token&redirect_uri=${encodeURIComponent(redirectUrl)}&response_mode=fragment&scope=openid%20profile%20email&state=12345&nonce=${Date.now()}`;
    
    // Redirect to B2C login page
    window.location.href = b2cUrl;
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
                  className="text-base bg-emerald-800 dark:bg-emerald-700 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-900 dark:hover:bg-emerald-600 shadow-sm hover:shadow-md transition-all"
                >
                  Get Started Free
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