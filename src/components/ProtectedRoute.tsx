import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, refreshUserData } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      // First check local auth state
      if (isAuthenticated && user) {
        setHasAccess(true);
        setIsVerifying(false);
        
        // Also refresh user data in the background
        refreshUserData().catch(console.error);
        return;
      }
      
      // If not authenticated locally, check for stored credentials
      const storedAuth = localStorage.getItem('authUser');
      const isStoredAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      
      if (storedAuth && isStoredAuthenticated) {
        try {
          // Try to refresh the token and user data
          const response = await api.fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });
          
          if (response.ok) {
            await refreshUserData();
            setHasAccess(true);
          } else {
            setHasAccess(false);
          }
        } catch (error) {
          console.error('Failed to verify authentication:', error);
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
      
      setIsVerifying(false);
    };

    verifyAccess();
  }, [isAuthenticated, user, refreshUserData]);

  if (isVerifying) {
    return <div className="flex items-center justify-center min-h-screen">Verifying access...</div>;
  }

  return hasAccess ? <>{children}</> : <Navigate to="/login" />;
};

export default ProtectedRoute;