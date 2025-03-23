// src/pages/CompleteProfile.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sparkles } from 'lucide-react';
import api from '../utils/api';


const CompleteProfile = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  
  // Load pending auth data
  useEffect(() => {
    const pendingAuthData = localStorage.getItem('pendingAuthData');
    if (!pendingAuthData) {
      navigate('/');
    }
  }, [navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // Validate email format
      if (!email || !email.includes('@') || !email.includes('.')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
      
      // Get the auth token from pendingAuthData
      const pendingAuthData = JSON.parse(localStorage.getItem('pendingAuthData') || '{}');
      const token = pendingAuthData.token;
      
      if (!token) {
        setError('Authentication data is missing');
        setLoading(false);
        return;
      }
      
      // Set up headers with auth token
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      // Call API to update email
      const response = await api.fetch('/api/update-email', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ email }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update email');
      }
      
      // Get updated user data
      const userData = await response.json();
      
      // Update auth data with new email
      const updatedAuthData = {
        ...pendingAuthData,
        email: userData.email
      };
      
      // Store in localStorage
      localStorage.setItem('authUser', JSON.stringify(updatedAuthData));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.removeItem('pendingAuthData');
      
      // Update auth store
      setUser(updatedAuthData);
      
      // Redirect based on whether this is a new user
      if (pendingAuthData.isNewUser) {
        navigate('/welcome');
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center px-4 py-2 mb-6 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">One Last Step</span>
            </div>
            <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
              Complete Your Profile
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              Please provide your email address to complete your account setup.
            </p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg mb-6 text-center">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none disabled:opacity-50 transition-colors"
              >
                {loading ? 'Processing...' : 'Complete Setup'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;