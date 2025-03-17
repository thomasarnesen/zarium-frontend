import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import { ThemeProvider } from './components/ThemeProvider';
import toast from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

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
  const { initialize, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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