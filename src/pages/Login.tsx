// Updated Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileSpreadsheet, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleHardReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    try {
      // Direct API approach without relying on CSRF token
      const response = await fetch('https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Authentication failed" }));
        throw new Error(errorData.error || "Authentication failed");
      }
      
      const userData = await response.json();
      
      // Update auth state manually
      localStorage.setItem('authUser', JSON.stringify(userData));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Update auth store state
      useAuthStore.getState().setUser(userData);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 mb-6">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Welcome Back</span>
            </div>
            <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">
              Sign in to your account
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100">
                Sign up
              </Link>
            </p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-center flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors border border-emerald-900 dark:border-emerald-600 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
              
              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                  Forgot your password?
                </Link>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleHardReset}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Having trouble? Clear browser data
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}