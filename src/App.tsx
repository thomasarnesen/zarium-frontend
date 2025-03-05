import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import Navbar from './components/Navbar';

// Import pages
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import PricingPage from './pages/Pricing';
import { Layout } from './components/Layout';

// Other components
const TermsOfService = () => <div>Terms of Service</div>;
const ResetPasswordForm = () => <div>Reset Password Form</div>;
const GenerationsHistory = () => <div>Generations History</div>;
const AccountSettings = () => <div>Account Settings</div>;
const NotFoundPage = () => <div>404 - Page Not Found</div>;
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Force token refresh every 10 minutes
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Apply dark mode class on initial load and when theme changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        // First try to restore session from localStorage
        await initialize();
        
        // Set up periodic token refresh
        const refreshInterval = setInterval(async () => {
          try {
            await api.fetch('/refresh-token', {
              method: 'POST',
              credentials: 'include'
            });
            console.log("Token refreshed successfully by interval");
          } catch (err) {
            console.warn("Scheduled token refresh failed:", err);
            // Don't log out automatically on failed refresh
          }
        }, TOKEN_REFRESH_INTERVAL);
        
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
    } else if (localStorage.getItem('isAuthenticated')) {
      // If we were authenticated before but not now, try to refresh token
      const attemptReauth = async () => {
        try {
          await api.fetch('/refresh-token', { 
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
    <BrowserRouter>
      <Navbar />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: isDark ? '#1f2937' : '#ffffff',
            color: isDark ? '#ffffff' : '#000000',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="reset-password" element={<ResetPasswordForm />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="terms" element={<TermsOfService />} />
          
          {/* Protected routes */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="generations" element={
            <ProtectedRoute>
              <GenerationsHistory />
            </ProtectedRoute>
          } />
          <Route path="account" element={
            <ProtectedRoute>
              <AccountSettings />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;