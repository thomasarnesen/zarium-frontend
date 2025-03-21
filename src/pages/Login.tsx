import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FileSpreadsheet, Sparkles } from 'lucide-react';
import csrfService from '../store/csrfService';
import SocialLogin from '../components/SocialLogin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrfLoading, setCsrfLoading] = useState(true);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const location = useLocation();

  // Hent CSRF-token ved innlasting av komponenten
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        setCsrfLoading(true);
        await csrfService.getToken();
        console.log("CSRF token hentet ved start av Login-komponenten");
      } catch (error) {
        console.error("Kunne ikke hente CSRF token:", error);
        setError("Det oppstod et problem med sikkerhetskonfigurasjonen. Prøv å laste siden på nytt.");
      } finally {
        setCsrfLoading(false);
      }
    };
    
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    // Check for session expiry or network error parameters
    const queryParams = new URLSearchParams(location.search);
    const sessionExpired = queryParams.get('session_expired');
    const networkError = queryParams.get('network_error');
    
    if (sessionExpired) {
      setError("Your session has expired. Please log in again.");
    } else if (networkError) {
      setError("Connection issue detected. Please log in again.");
    }
    
    // Clean up URL parameters after we've used them
    if (sessionExpired || networkError) {
      window.history.replaceState({}, document.title, '/login');
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Dobbeltsjekk at vi har CSRF-token
      if (!csrfService._token) {
        try {
          await csrfService.getToken();
        } catch (csrfError) {
          throw new Error("Kunne ikke hente sikkerhetstoken. Prøv å laste siden på nytt.");
        }
      }
      
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes("403")) {
        setError("Innlogging feilet på grunn av manglende sikkerhetstoken. Prøv å laste siden på nytt.");
      } else {
        setError(error.message || 'Feil e-post eller passord');
      }
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
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-center">
                  {error}
                </div>
              )}
              
              {csrfLoading && (
                <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-200 px-4 py-3 rounded-lg text-center">
                  Forbereder sikker innlogging...
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
                />
              </div>

              <button
                type="submit"
                disabled={loading || csrfLoading}
                className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors border border-emerald-900 dark:border-emerald-600"
              >
                {loading ? 'Signing in...' : (csrfLoading ? 'Preparing...' : 'Sign in')}
              </button>
              
              <SocialLogin 
                onLoginStart={() => setLoading(true)}
                onLoginError={(error) => {
                  setLoading(false);
                  setError(error.message);
                }}
              />
              
              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
                  Forgot your password?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}