import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Sparkles, Mail } from 'lucide-react';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await api.fetch('/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send reset link');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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
              <span className="text-sm font-medium">Reset Password</span>
            </div>
            <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">
              Forgot your password?
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8">
            {isSubmitted ? (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                    <Mail className="h-6 w-6" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                  Check your email
                </h3>
                <p className="text-emerald-700 dark:text-emerald-300 mb-4">
                  If your email address is registered with us, you'll receive a password reset link shortly.
                </p>
                <Link 
                  to="/login" 
                  className="inline-block px-4 py-2 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-center">
                    {error}
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
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors border border-emerald-900 dark:border-emerald-600"
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="text-center">
                  <Link to="/login" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}