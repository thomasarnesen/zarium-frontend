import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  User,
  LogOut,
  Coins,
  CreditCard,
  HelpCircle,
  FileText,
  Shield,
  ChevronDown
} from 'lucide-react';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Get the display name to show in the menu - display spaces but store with underscores
  const displayName = user?.displayName && user.displayName !== 'unknown' 
    ? user.displayName.replace(/_/g, ' ') // Replace underscores with spaces for display
    : null; // Return null instead of email if no display name

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Redirect to welcome page if no display name
  useEffect(() => {
    if (user && (!user.displayName || user.displayName === 'unknown')) {
      navigate('/welcome');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    {
      label: 'Tokens',
      icon: Coins,
      action: () => {
        if (user?.planType === 'Demo') {
          navigate('/subscription');
        } else {
          navigate('/tokens');
        }
        setIsOpen(false);
      }
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100 transition-colors px-3 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
      >
        <User className="h-5 w-5" />
        {displayName ? (
          <span className="text-sm font-medium">{displayName}</span>
        ) : (
          <span className="text-sm font-medium text-gray-400">Set display name</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-emerald-100 dark:border-emerald-800 py-2 z-50">
          
          <div className="px-4 py-3 border-b border-emerald-100 dark:border-emerald-800">
            <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {displayName || "Welcome!"}
            </div>
            <div className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              {user?.tokens?.toLocaleString()} tokens available
            </div>
          </div>

          <div className="py-2">
            <Link
              to="/dashboard"
              className="flex items-center px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <User className="h-4 w-4 mr-3" />
              Dashboard
            </Link>

            <Link
              to="/subscription"
              className="flex items-center px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <CreditCard className="h-4 w-4 mr-3" />
              My Subscription
            </Link>

            <button
              onClick={menuItems[0].action}
              className="flex items-center w-full px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <Coins className="h-4 w-4 mr-3" />
              Tokens
            </button>

            <div className="border-t border-emerald-100 dark:border-emerald-800 my-2"></div>

            <Link
              to="/help"
              className="flex items-center px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <HelpCircle className="h-4 w-4 mr-3" />
              Get Help
            </Link>

            <Link
              to="/terms"
              className="flex items-center px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <FileText className="h-4 w-4 mr-3" />
              Terms & Conditions
            </Link>

            <Link
              to="/privacy"
              className="flex items-center px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/50"
            >
              <Shield className="h-4 w-4 mr-3" />
              Privacy Policy
            </Link>

            <div className="border-t border-emerald-100 dark:border-emerald-800 my-2"></div>

            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
            >
              <LogOut className="h-4 w-4 mr-3" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
