import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sparkles, ArrowRight, FileSpreadsheet, Zap, HelpCircle } from 'lucide-react';
import api from '../utils/api';

export default function WelcomePage() {
  const { user, refreshUserData } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const navigate = useNavigate();

  // Make sure user data is fresh
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // If no user is found, redirect to login
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check if user already has a display name
  useEffect(() => {
    if (user && user.displayName && user.displayName !== 'unknown') {
      setNameSubmitted(true);
    }
  }, [user]);

  interface UpdateDisplayNameResponse {
    displayName: string;
  }

  const handleNameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Please enter what we should call you');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${api.apiUrl}/api/update-display-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData: { error?: string } = await response.json();
        throw new Error(errorData.error || 'Failed to update display name');
      }

      // Update local storage with new display name
      const userData: UpdateDisplayNameResponse = await response.json();
      const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      storedUser.displayName = userData.displayName;
      localStorage.setItem('authUser', JSON.stringify(storedUser));

      setNameSubmitted(true);
      await refreshUserData();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const goToSubscription = () => {
    navigate('/subscription');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Welcome to Zarium!</span>
          </div>
          
          <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-6">
            Your Demo Account is Ready
          </h1>
          
          {/* Name Collection Form */}
          {!nameSubmitted && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8 mb-10">
              <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
                What should we call you?
              </h2>
              
              <p className="text-emerald-700 dark:text-emerald-300 mb-6">
                Please enter your name to personalize your experience.
              </p>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg mb-4 text-center">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none disabled:opacity-70 transition-colors"
                >
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </form>
            </div>
          )}

          {/* Show account details section ONLY if name is submitted */}
          {nameSubmitted && (
            <>
              <p className="text-lg text-emerald-700 dark:text-emerald-300 mb-10">
                You now have access to Zarium's Excel generation features with your demo account.
                Demo accounts include 50,000 tokens - enough to try out the platform and see how it works.
              </p>

              <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8 mb-12">
                <div className="flex items-center justify-center mb-6">
                  <FileSpreadsheet className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
                </div>
                
                <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
                  Your Demo Account Details
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between py-2 border-b border-emerald-100 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-300">Name</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {user.displayName || displayName}
                    </span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-emerald-100 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-300">Plan</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">{user.planType}</span>
                  </div>
                  
                  <div className="flex justify-between py-2 border-b border-emerald-100 dark:border-emerald-800">
                    <span className="text-emerald-700 dark:text-emerald-300">Available Tokens</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">{user.tokens?.toLocaleString() || '50,000'}</span>
                  </div>
                  
                  <div className="flex justify-between py-2">
                    <span className="text-emerald-700 dark:text-emerald-300">Demo Duration</span>
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">7 days</span>
                  </div>
                </div>
                
                <button
                  onClick={goToDashboard}
                  className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <span>Start Using Zarium</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                    Generate Excel Files
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300">
                    Create professional Excel spreadsheets by describing what you need in plain language.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                    Preview Results
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300">
                    See what your AI-generated Excel files look like before downloading them.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                    Get Help
                  </h3>
                  <p className="text-emerald-700 dark:text-emerald-300">
                    Access our help documentation to get the most out of your Zarium experience.
                  </p>
                </div>
              </div>
              
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-8 border border-emerald-100 dark:border-emerald-800">
                <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
                  Ready for More?
                </h2>
                <p className="text-emerald-700 dark:text-emerald-300 mb-6">
                  Upgrade to a paid plan to unlock additional features like downloading files, 
                  uploading custom Excel files, and accessing more tokens per month.
                </p>
                <button
                  onClick={goToSubscription}
                  className="py-3 px-6 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors"
                >
                  View Plans & Pricing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}