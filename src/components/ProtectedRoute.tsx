import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isDemoMode } = useAuthStore();
  
  console.log("User data in protected route:", user);
  console.log("Token:", user?.token);

  if (!isDemoMode && !user?.token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}