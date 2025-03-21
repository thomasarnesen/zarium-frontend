// src/components/LogoutCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const LogoutCallback = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  
  useEffect(() => {
    // Utfør lokal utlogging
    const performLogout = async () => {
      try {
        await logout();
        // Omdiriger til hjemmesiden
        navigate('/', { replace: true });
      } catch (error) {
        console.error("Error during logout callback:", error);
        // Uansett omdiriger til hjemmesiden
        navigate('/', { replace: true });
      }
    };
    
    performLogout();
  }, [logout, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Logging out...</p>
      </div>
    </div>
  );
};

export default LogoutCallback;