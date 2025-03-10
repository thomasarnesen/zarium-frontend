import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import { ThemeProvider } from './components/ThemeProvider';

// Importer komponenter riktig - juster disse basert på feilene
import {Layout }from './components/Layout';
import Home from './pages/Home';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard'; 
import PricingPage from './pages/Pricing';
import {TermsOfService} from './pages/TermsOfService';
import {PrivacyPolicy} from './pages/PrivacyPolicy';
import {HelpPage} from './pages/HelpPage';
import {TokensPage} from './pages/TokensPage';
import {MySubscription} from './pages/MySubscription';
import ErrorPage from './pages/ErrorPage';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPasswordPage from './components/ForgotPassword';

// Force token refresh every 10 minutes
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const { isDark } = useThemeStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        await initialize();
        
        const refreshInterval = setInterval(async () => {
          try {
            await api.fetch('/refresh-token', {
              method: 'POST',
              credentials: 'include'
            });
            console.log("Token refreshed successfully by interval");
          } catch (err) {
            console.warn("Scheduled token refresh failed:", err);
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

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('isAuthenticated', 'true');
    } else if (localStorage.getItem('isAuthenticated')) {
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
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
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
  );
}

export default App;