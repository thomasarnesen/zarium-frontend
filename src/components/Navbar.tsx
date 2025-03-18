import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { Sun, Moon, FileSpreadsheet } from 'lucide-react';
import UserMenu from './UserMenu';

export default function Navbar() {
  const { user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

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
                <UserMenu />
              </>
            ) : (
              <>
                <Link
                  to="/pricing"
                  className="text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  Pricing
                </Link>
                <Link
                  to="/login"
                  className="text-base text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-base bg-emerald-800 dark:bg-emerald-700 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-900 dark:hover:bg-emerald-600 shadow-sm hover:shadow-md transition-all"
                >
                  Sign Up
                </Link>
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