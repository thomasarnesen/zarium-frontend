import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, refreshUserData } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();

  // Lytter på autentiseringsendringer
  useEffect(() => {
    const handleAuthChange = () => {
      if (!isAuthenticated) {
        setHasAccess(false);
      }
    };
    
    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, [isAuthenticated]);

  // Hovedverifiseringsprosess
  useEffect(() => {
    const verifyAccess = async () => {
      // Sjekk først hvis brukeren har manuelt logget ut
      if (localStorage.getItem('manualLogout') === 'true') {
        setHasAccess(false);
        setIsVerifying(false);
        return;
      }
      
      // Sjekk lokal autentiseringstilstand
      if (isAuthenticated && user) {
        setHasAccess(true);
        setIsVerifying(false);
       
        // Oppdater brukerdata i bakgrunnen
        refreshUserData().catch(console.error);
        return;
      }
     
      // Hvis ikke autentisert lokalt, sjekk for lagrede legitimasjoner
      const storedAuth = localStorage.getItem('authUser');
      const isStoredAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
     
      if (storedAuth && isStoredAuthenticated) {
        try {
          // Prøv å fornye token og brukerdata
          const response = await api.fetch('/refresh-token', {
            method: 'POST',
            credentials: 'include'
          });
         
          if (response.ok) {
            await refreshUserData();
            setHasAccess(true);
          } else {
            // Fjern lokalt lagrede autentiseringsdata hvis fornyelse mislykkes
            localStorage.removeItem('authUser');
            localStorage.removeItem('isAuthenticated');
            setHasAccess(false);
          }
        } catch (error) {
          console.error('Failed to verify authentication:', error);
          localStorage.removeItem('authUser');
          localStorage.removeItem('isAuthenticated');
          setHasAccess(false);
        }
      } else {
        setHasAccess(false);
      }
     
      setIsVerifying(false);
    };

    verifyAccess();
    
    // Kjør en ekstra sjekk etter kort tid for å håndtere race conditions
    const delayedCheck = setTimeout(() => {
      if (!isAuthenticated) {
        setHasAccess(false);
      }
    }, 200);
    
    return () => clearTimeout(delayedCheck);
  }, [isAuthenticated, user, refreshUserData]);

  // Reagerer umiddelbart på endringer i autentiseringstilstand
  useEffect(() => {
    if (!isAuthenticated && !isVerifying) {
      setHasAccess(false);
    }
  }, [isAuthenticated, isVerifying]);

  if (isVerifying) {
    return <div className="flex items-center justify-center min-h-screen">Verifying access...</div>;
  }

  return hasAccess ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;