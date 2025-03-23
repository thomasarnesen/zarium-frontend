import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { Footer } from './Footer';
import { useAuthStore } from '../store/authStore';
import { useState } from 'react';

export const Layout = () => {
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const [showMaintenanceBanner, setShowMaintenanceBanner] = useState(true);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      {showMaintenanceBanner && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 relative">
          <button 
            onClick={() => setShowMaintenanceBanner(false)}
            className="absolute top-2 right-2 text-amber-700 hover:text-amber-900"
            aria-label="Close maintenance notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>
              <strong>Maintenance in progress:</strong> The site is currently undergoing maintenance and you may experience issues. This will be completed within a couple of hours. We apologize for the inconvenience!
            </p>
          </div>
        </div>
      )}
      <main className="flex-grow">
        <Outlet />
      </main>
      {/* Only show footer for non-authenticated users */}
      {!isAuthenticated && <Footer />}
    </div>
  );
};
