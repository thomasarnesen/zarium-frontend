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
import csrfService from './store/csrfService';

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

// Force token refresh every 10 minutes
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
  const { initialize, isAuthenticated, isLoading } = useAuthStore();
  const { isDark } = useThemeStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        // First try to restore session from localStorage
        await initialize();
        
        // Set up periodic token refresh
        const refreshInterval = setInterval(async () => {
          try {
            // Check if user manually logged out
            const wasManuallyLoggedOut = localStorage.getItem('manualLogout') === 'true';
            if (wasManuallyLoggedOut) {
              clearInterval(refreshInterval);
              return;
            }
            
            await api.fetch('/api/refresh-token', {
              method: 'POST',
              credentials: 'include'
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
      } catch (err) {
        console.error("App initialization error:", err);
        setError("Failed to initialize application");
      }
    };

    initApp();
  }, [initialize]);

  // Listen for auth changes and store in localStorage
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
      // Remove manual logout flag when user is logged in
      localStorage.removeItem('manualLogout');
    } else if (localStorage.getItem('isAuthenticated')) {
      // If we were authenticated before, but not now, check if it was manual logout
      const wasManuallyLoggedOut = localStorage.getItem('manualLogout') === 'true';
      
      if (!wasManuallyLoggedOut) {
        // Only attempt re-auth if it wasn't manual logout
        const attemptReauth = async () => {
          try {
            await api.fetch('/api/refresh-token', { 
              method: 'POST',
              credentials: 'include'
            });
            await initialize();
          } catch (err) {
            console.warn("Re-authentication failed:", err);
            localStorage.removeItem('isAuthenticated');
          }
        };
        attemptReauth();
      }
    }
  }, [isAuthenticated, initialize]);

  // Improved error detection to prevent infinite refresh loops
  useEffect(() => {
    let consecutiveErrors = 0;
    let lastErrorTime = 0;
    const maxConsecutiveErrors = 3; // Max number of retries before giving up
    const errorTimeWindow = 10000; // 10 seconds
    
    // Listen for security-related error messages in DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Check for various security-related error messages - update to include translated versions
              if (
                element.textContent?.includes('security configuration') ||
                element.textContent?.includes('CSRF token') ||
                element.textContent?.includes('security token') ||
                element.textContent?.includes('Could not retrieve security token') || // Translated from "Kunne ikke hente sikkerhetstoken"
                // Keep the Norwegian versions for backward compatibility, but eventually they can be removed
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
                
                // If too many consecutive errors, don't retry
                if (consecutiveErrors > maxConsecutiveErrors) {
                  console.error('Too many consecutive security errors - stopping automatic retry');
                  // Show a helpful error to the user instead of looping
                  document.body.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
                      <div style="max-width:500px;padding:20px;background-color:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);text-align:center;">
                        <h1 style="font-size:24px;color:#ef4444;margin-bottom:16px;">Security Error Detected</h1>
                        <p style="margin-bottom:16px;">We're having trouble with the security verification. Please try clearing your cookies or use a different browser.</p>
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
                
                // Reset CSRF token
                try {
                  csrfService.resetToken();
                  
                  // Wait a progressive amount of time before reload (1s, 2s, 3s)
                  setTimeout(() => window.location.reload(), consecutiveErrors * 1000);
                } catch (error) {
                  console.warn('Could not reset CSRF token:', error);
                  setTimeout(() => window.location.reload(), consecutiveErrors * 1000);
                }
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  // Show loading spinner while app initializes - update comment to English
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
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
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="help" element={<HelpPage />} />
              
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

export default App;