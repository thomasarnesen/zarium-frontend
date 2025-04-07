import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import { ThemeProvider } from './components/ThemeProvider';
import { HelmetProvider } from 'react-helmet-async';
import LoadingSpinner from './components/LoadingSpinner';

// Import pages
import Home from './pages/Home';
import DashboardPage from './pages/Dashboard';
import PricingPage from './pages/Pricing';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { HelpPage } from './pages/HelpPage';
import { TokensPage } from './pages/TokensPage';
import { MySubscription } from './pages/MySubscription';
import ErrorPage from './pages/ErrorPage';
import ProtectedRoute from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import AuthCallback from './components/AuthCallback'; 
import LogoutCallback from './components/LogoutCallback'; 
import WelcomePage from './pages/WelcomePage';
import CompleteProfile from './pages/CompleteProfile';
import toast from 'react-hot-toast';
import AdminDashboard from './pages/AdminDashboard';
import Contact from './components/Contact';

/* 
  VIKTIG: Ikke skriv JSX-kode utenfor funksjonskomponenter her. 
  Alt JSX må være inne i en funksjonskomponent.
*/

// NOTAT: Det var tidligere en JSX-kode her som så ut som en kommentar,
// men som faktisk ble tolket som kode. Dette er fjernet.
// Bruk heller AuthDebugPage-komponenten inne i ruter.

// Token refresh interval (10 minutes)
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

// Create a wrapper component for automatic redirection
function AuthRedirectWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If user is authenticated and on the home page, redirect to dashboard
    if (isAuthenticated && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, location.pathname]);

  return <>{children}</>;
}

// Auth Debug component
function AuthDebugPage() {
  const [authState, setAuthState] = useState(null);
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug</h1>
      <div className="bg-gray-100 p-4 rounded">
        <p className="mb-2"><strong>Auth Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</p>
        
        {user && (
          <>
            <p className="mb-2"><strong>User Email:</strong> {user?.email}</p>
            <p className="mb-2"><strong>User ID:</strong> {user?.id}</p>
            <p className="mb-2"><strong>Plan Type:</strong> {user?.planType}</p>
            <p className="mb-2"><strong>Is Super Admin:</strong> {user?.isSuperAdmin ? 'Yes' : 'No'}</p>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { initialize, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        setIsLoading(true);
        
        // Initialize auth in the background without waiting
        initialize().catch(err => {
          console.warn("Auth initialization issue (non-blocking):", err);
        });
        
        // Allow app to be displayed after a short time regardless of auth status
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
    // Don't do token refresh if user is not logged in
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

  // Check for B2C auth redirects - improved detection
  useEffect(() => {
    const checkForAuthResults = () => {
      // Check if we're returning from B2C login with token in the URL hash 
      // (this is how Azure B2C works)
      if (window.location.hash && window.location.hash.includes('id_token=')) {
        // Determine if we're already on the callback page
        if (window.location.pathname !== '/auth/callback') {
          console.log("Detected auth redirect with token in hash, redirecting to callback handler");
          
          // Get the full hash including the '#' character
          const fullHash = window.location.hash;
          
          // Redirect to the callback handler
          window.location.href = `/auth/callback${fullHash}`;
          return;
        }
      }
      
      // Check for code parameter (OAuth2 authorization code flow, typically used by Google)
      if (window.location.search && window.location.search.includes('code=')) {
        if (window.location.pathname !== '/auth/callback') {
          console.log("Detected auth code in URL, redirecting to callback handler");
          
          // Add provider=google to help the callback determine the correct flow
          const separator = window.location.search.includes('?') ? '&' : '?';
          window.location.href = `/auth/callback${window.location.search}${separator}provider=google`;
        }
      }
    };
    
    checkForAuthResults();
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
          <PostPaymentHandler />
          
          <Routes>
            <Route path="/" element={
              <AuthRedirectWrapper>
                <Layout />
              </AuthRedirectWrapper>
            }>
              {/* Public routes that don't require login */}
              <Route index element={<Home />} />
              <Route path="logout-callback" element={<LogoutCallback />} />
              <Route path="terms" element={<TermsOfService />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="contact" element={<Contact />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              
              {/* Add this new route */}
              <Route path="complete-profile" element={<CompleteProfile />} />
              
              {/* Debug route - moved into function component */}
              <Route path="debug-auth" element={<AuthDebugPage />} />
              
              {/* Pricing route - only accessible to authenticated users */}
              <Route path="pricing" element={
                isAuthenticated ? <PricingPage /> : <Navigate to="/" replace />
              } />
              
              {/* Protected routes */}
              <Route path="welcome" element={
                <ProtectedRoute>
                  <WelcomePage />
                </ProtectedRoute>
              } />
              
              <Route path="admin" element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
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
              
              {/* Redirect any attempts to access login/register pages to direct auth */}
              <Route path="login" element={<Navigate to="/" replace />} />
              <Route path="register" element={<Navigate to="/" replace />} />
              
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