import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import { ThemeProvider } from './components/ThemeProvider';
import toast from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import LoadingSpinner from './components/LoadingSpinner';

// Import pages
import Home from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import PricingPage from './pages/Pricing';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { HelpPage } from './pages/HelpPage';
import { TokensPage } from './pages/TokensPage';
import { MySubscription } from './pages/MySubscription';
import ForgotPasswordPage from './pages/ForgotPassword';
import ResetPasswordPage from './pages/ResetPassword';
import ErrorPage from './pages/ErrorPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import AuthCallback from './components/AuthCallback'; 
import LogoutCallback from './components/LogoutCallback'; 
import WelcomePage from './pages/WelcomePage';

// Token refresh interval (10 minutter)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

// Component to handle post-payment actions
function PostPaymentHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeRegistrationAfterPayment, refreshUserData } = useAuthStore();
  
  useEffect(() => {
    const handleSuccessfulPayment = async () => {
      const searchParams = new URLSearchParams(location.search);
      const success = searchParams.get('success') === 'true';
      const email = searchParams.get('email');
      
      if (success && email) {
        // Try to complete the registration
        const result = await completeRegistrationAfterPayment(email);
        
        if (result) {
          // Registration completed successfully
          toast.success('Your account has been created and payment processed successfully!');
          // Refresh user data to get latest tokens, etc.
          await refreshUserData();
        } else {
          // The user was created by the webhook, but we couldn't log them in automatically
          toast.success('Payment successful! Please log in with your credentials.');
          // Redirect to login
          navigate('/login');
          return;
        }
      } else if (success) {
        // Payment was successful for existing user (not a new registration)
        toast.success('Payment processed successfully!');
        // Refresh user data to get latest tokens, etc.
        await refreshUserData();
      }
      
      // Clean up URL parameters
      if (success) {
        // Remove query params but keep on dashboard
        navigate('/dashboard', { replace: true });
      }
    };
    
    // Check if we're coming back from a payment
    if (location.search.includes('success=')) {
      handleSuccessfulPayment();
    }
  }, [location, completeRegistrationAfterPayment, navigate, refreshUserData]);
  
  return null;
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { initialize, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Start initialisering uten å blokkere UI
        setIsLoading(true);
        
        // Initialiser auth i bakgrunnen uten å vente på den
        initialize().catch(err => {
          console.warn("Auth initialization issue (non-blocking):", err);
        });
        
        // Tillat app å vises etter kort tid uansett auth-status
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
        
      } catch (err) {
        console.error("App initialization error:", err);
        setError("Failed to initialize application");
        setIsLoading(false);
      }
    };

    initApp();
  }, [initialize]);

  // Set up token refresh interval
  useEffect(() => {
    // Ikke gjør token refresh hvis brukeren ikke er logget inn
    if (!isAuthenticated) return;
    
    console.log("Setting up token refresh interval");
    
    const refreshInterval = setInterval(async () => {
      try {
        // Check if user manually logged out
        const wasManuallyLoggedOut = localStorage.getItem('manualLogout') === 'true';
        if (wasManuallyLoggedOut) {
          clearInterval(refreshInterval);
          return;
        }
        
        // Add cache busting parameter to avoid stale requests
        await api.fetch('/api/refresh-token', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        console.log("Token refreshed successfully by interval");
      } catch (err) {
        console.warn("Scheduled token refresh failed:", err);
        // Don't log out automatically on failed refresh
      }
    }, TOKEN_REFRESH_INTERVAL);
    
    // Store interval so it can be canceled on logout
    (window as any)['tokenRefreshInterval'] = refreshInterval;
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated]);

  // Listen for auth changes
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
      // Remove manual logout flag when user is logged in
      localStorage.removeItem('manualLogout');
    }
  }, [isAuthenticated]);

  // Check for B2C auth redirects
  useEffect(() => {
    const checkForAuthResults = () => {
      // Sjekk om vi har returnert fra en Azure B2C-innlogging
      if (window.location.hash.includes('id_token=')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const idToken = hashParams.get('id_token');
        
        if (idToken) {
          // Fjern token fra URL av sikkerhetsgrunner
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Prosesser token
          console.log("Detected returning from B2C auth flow, processing token...");
          
          // Send brukeren til AuthCallback
          window.location.href = '/auth/callback?id_token=' + encodeURIComponent(idToken);
        }
      }
    };
    
    // Kjør sjekk ved oppstart
    checkForAuthResults();
  }, []);

  // Improved error detection to prevent infinite refresh loops
  useEffect(() => {
    // Store timestamp of last refresh in localStorage to detect loops
    const lastRefreshTime = localStorage.getItem('lastSecurityRefresh');
    const now = Date.now();
    
    // If we've refreshed in the last 10 seconds, don't allow another automatic refresh
    if (lastRefreshTime && (now - parseInt(lastRefreshTime)) < 10000) {
      console.warn('Potential refresh loop detected - preventing automatic refresh');
      // Clear any existing detection to break the loop
      localStorage.removeItem('lastSecurityRefresh');
      return;
    }

    let consecutiveErrors = 0;
    let lastErrorTime = 0;
    const maxConsecutiveErrors = 2; // Reduced from 3 to be more conservative
    const errorTimeWindow = 10000; // 10 seconds
    
    // Initialize error tracking
    window.__zarium_errors = window.__zarium_errors || [];
    window.__zarium_lastErrorTime = window.__zarium_lastErrorTime || 0;
    
    // Global error handler to catch JS errors
    const errorHandler = (event: ErrorEvent) => {
      const now = Date.now();
      if (window.__zarium_errors) {
        window.__zarium_errors.push({
          message: event.message,
          time: now
        });
      }
      window.__zarium_lastErrorTime = now;
      
      console.error('Global error:', event.message);
    };
    
    window.addEventListener('error', errorHandler);
    
    // Listen for security-related error messages in DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for various security-related error messages
              if (
                element.textContent?.includes('security configuration') ||
                element.textContent?.includes('CSRF token') ||
                element.textContent?.includes('security token') ||
                element.textContent?.includes('Could not retrieve security token') ||
                element.textContent?.includes('sikkerhetskonfigurasjonen') || 
                element.textContent?.includes('sikkerhetstoken')
              ) {
                const now = Date.now();
                
                // Check if we're in an error loop
                if (now - lastErrorTime < errorTimeWindow) {
                  consecutiveErrors++;
                } else {
                  // Reset counter if errors are not consecutive
                  consecutiveErrors = 1;
                }
                
                lastErrorTime = now;
                
                // If too many consecutive errors, don't retry automatically
                if (consecutiveErrors > maxConsecutiveErrors) {
                  console.error('Too many consecutive security errors - stopping automatic retry');
                  // Show a helpful message instead of infinite reloads
                  document.body.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
                      <div style="max-width:500px;padding:20px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
                        <h1 style="font-size:24px;color:#ef4444;margin-bottom:16px;">Security Error Detected</h1>
                        <p style="margin-bottom:16px;">We're having trouble with the security verification. Please try the following:</p>
                        <ul style="text-align:left;margin-bottom:16px;">
                          <li style="margin-bottom:8px;">Clear your cookies and browser cache</li>
                          <li style="margin-bottom:8px;">Try a different browser</li>
                          <li style="margin-bottom:8px;">Disable any ad blockers or privacy extensions</li>
                        </ul>
                        <div style="margin-bottom:16px;display:flex;justify-content:center;gap:10px;">
                          <button onclick="localStorage.clear(); sessionStorage.clear(); document.cookie.split(';').forEach(c => document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')); window.location.href='/';" style="padding:8px 16px;background-color:#059669;color:white;border:none;border-radius:6px;cursor:pointer;">
                            Clear Data & Restart
                          </button>
                          <button onclick="window.location.href='/'" style="padding:8px 16px;background-color:#f3f4f6;color:#1f2937;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;">
                            Go to Homepage
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                  return;
                }
                
                console.log('Security-related error message detected - retrying (' + consecutiveErrors + '/' + maxConsecutiveErrors + ')');
                
                // Only allow refresh if we haven't recently refreshed
                if (!lastRefreshTime || (now - parseInt(lastRefreshTime)) > 10000) {
                  try {
                    // Store the refresh timestamp to prevent loops
                    localStorage.setItem('lastSecurityRefresh', now.toString());
                    
                    // Wait before reload (1s, 2s)
                    setTimeout(() => window.location.reload(), consecutiveErrors * 1000);
                  } catch (error) {
                    console.warn('Error during security refresh:', error);
                    setTimeout(() => window.location.reload(), consecutiveErrors * 1000);
                  }
                } else {
                  console.warn('Preventing rapid refresh - last refresh too recent');
                }
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  // Show loading spinner while app initializes
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Application Error</h2>
          <p className="mb-6 text-gray-700 dark:text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                background: isDark ? '#1f2937' : '#ffffff',
                color: isDark ? '#ffffff' : '#000000',
              },
            }}
          />
          {/* Add the PostPaymentHandler component */}
          <PostPaymentHandler />
          
          <Routes>
            <Route path="/" element={<Layout />}>
              {/* Public routes that don't require login */}
              <Route index element={<Home />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="logout-callback" element={<LogoutCallback />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              
              {/* Add Welcome route */}
              <Route path="welcome" element={
                <ProtectedRoute>
                  <WelcomePage />
                </ProtectedRoute>
              } />
              
              {/* Protected routes */}
              <Route path="dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              
              <Route path="subscription" element={
                <ProtectedRoute>
                  <MySubscription />
                </ProtectedRoute>
              } />
              
              <Route path="tokens" element={
                <ProtectedRoute>
                  <TokensPage />
                </ProtectedRoute>
              } />
              
              {/* Catch all route */}
              <Route path="*" element={<ErrorPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </HelmetProvider>
  );
}

// Add this type declaration to avoid TypeScript errors
declare global {
  interface Window {
    __zarium_errors?: Array<{message: string, time: number}>;
    __zarium_lastErrorTime?: number;
  }
}

export default App;