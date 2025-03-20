import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner'; // Import LoadingSpinner component

// Component to protect routes that require login
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Show loading spinner while authentication status is checked
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Redirect to login page if user is not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Return children if user is authenticated
  return <>{children}</>;
};

export default ProtectedRoute;