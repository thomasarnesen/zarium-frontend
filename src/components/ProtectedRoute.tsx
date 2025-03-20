import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner'; // Importer LoadingSpinner-komponenten

// Komponent for å beskytte ruter som krever innlogging
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Viser lastespinner mens autentiseringsstatus sjekkes
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Omdirigerer til login-siden hvis brukeren ikke er autentisert
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Returnerer barna hvis brukeren er autentisert
  return <>{children}</>;
};

export default ProtectedRoute;