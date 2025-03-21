import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import{ config} from '../config';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthenticated, refreshUserData } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showRedirectMessage, setShowRedirectMessage] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Sjekk for manuell utlogging
        if (localStorage.getItem('manualLogout') === 'true') {
          setHasAccess(false);
          setIsVerifying(false);
          return;
        }
        
        // Sjekk lokal autentiseringstilstand
        if (isAuthenticated && user) {
          setHasAccess(true);
          setIsVerifying(false);
          return;
        }
        
        // Start en timer som vil vise en melding hvis verifisering tar for lang tid
        const messageTimer = setTimeout(() => {
          setShowRedirectMessage(true);
        }, 3000);
        
        // Sjekk for lagrede brukernavn/passord
        const storedAuth = localStorage.getItem('authUser');
        const isStoredAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        
        if (storedAuth && isStoredAuthenticated) {
          try {
            // Sett en timeout for API-kall
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(`${config.apiUrl}/api/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              await refreshUserData();
              setHasAccess(true);
            } else {
              // Fjern autentiseringsdata hvis fornyelse mislykkes
              localStorage.removeItem('authUser');
              localStorage.removeItem('isAuthenticated');
              setHasAccess(false);
            }
          } catch (error) {
            console.warn('Authentication verification failed:', error);
            setHasAccess(false);
          }
        } else {
          setHasAccess(false);
        }
        
        setIsVerifying(false);
        clearTimeout(messageTimer);
      } catch (error) {
        console.error('Error in verifyAccess:', error);
        setHasAccess(false);
        setIsVerifying(false);
      }
    };
    
    verifyAccess();
  }, [isAuthenticated, user, refreshUserData]);
  
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-800 rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-800 dark:text-emerald-200">Verifiserer tilgang...</p>
        
        {showRedirectMessage && (
          <div className="mt-4 text-center max-w-md px-4">
            <p className="text-emerald-700 dark:text-emerald-300 mb-2">
              Dette tar lengre tid enn forventet.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Gå til innlogging
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return hasAccess ? <>{children}</> : <Navigate to="/login" replace />;
};
export default ProtectedRoute;