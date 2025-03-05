import { useEffect, useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import ProtectedRoute from './components/ProtectedRoute';
import MaintenancePage from './components/MaintenancePage';
import { useMaintenanceStore } from './store/maintenanceStore';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import { TokensPage } from './pages/TokensPage';
import { HelpPage } from './pages/HelpPage';
import { TermsOfService } from './pages/TermsOfService';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { MySubscription } from './pages/MySubscription';
import api from './utils/api';
import { Layout } from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import ErrorScreen from './components/ErrorScreen';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ErrorPage from './pages/ErrorPage';  

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/pricing", element: <Pricing /> },
      { path: "/terms", element: <TermsOfService /> },
      { path: "/privacy", element: <PrivacyPolicy /> },
      { path: "/help", element: <HelpPage /> },
      {
        path: "/dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>
      },
      {
        path: "/tokens",
        element: <ProtectedRoute><TokensPage /></ProtectedRoute>
      },
      {
        path: "/subscription",
        element: <ProtectedRoute><MySubscription /></ProtectedRoute>
      }
    ]
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

export default function App() {
  const isMaintenanceMode = useMaintenanceStore((state) => state.isMaintenanceMode);
  const isDark = useThemeStore((state) => state.isDark);
  const setUser = useAuthStore((state) => state.setUser);
  const initialize = useAuthStore(state => state.initialize);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          if (userData.token) {
            const response = await api.fetch('/verify-token', {
              headers: {
                'Authorization': `Bearer ${userData.token}`,
              }
            });
            
            if (response.ok) {
              const verifiedData = await response.json();
              setUser({
                ...userData,
                ...verifiedData
              });
            } else {
              console.log('Token verification failed, logging out');
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('Failed to initialize application');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [setUser]);

  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        await initialize();
        
        // Sett opp intervall for token-fornyelse
        const refreshInterval = setInterval(async () => {
          try {
            await api.fetch('/refresh-token', {
              method: 'POST',
              credentials: 'include'
            });
          } catch (error) {
            console.warn('Token refresh failed:', error);
          }
        }, 15 * 60 * 1000); // Forny token hvert 15. minutt

        return () => clearInterval(refreshInterval);
      } catch (error) {
        console.error('Error initializing app:', error);
        setError('Failed to initialize application');
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, [initialize]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (isLoading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (isMaintenanceMode) return <MaintenancePage />;

  return <RouterProvider router={router} />;
}