import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { Footer } from './Footer';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';

export const Layout = () => {
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const location = useLocation();
  const [showNavbar, setShowNavbar] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  
  // Check if we're on the dashboard
  const isDashboard = location.pathname === '/dashboard';

  // Listen for custom event from Dashboard component
  useEffect(() => {
    const handleFirstMessageSent = (event: CustomEvent) => {
      setFirstMessageSent(event.detail.firstMessageSent);
    };

    // Add event listener for custom event
    window.addEventListener('firstMessageSentUpdated', handleFirstMessageSent as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('firstMessageSentUpdated', handleFirstMessageSent as EventListener);
    };
  }, []);

  // Effect to update navbar visibility based on conditions
  useEffect(() => {
    if (isDashboard && firstMessageSent) {
      // On dashboard after first message: hide navbar by default, show on hover
      setShowNavbar(isHovering);
    } else {
      // For all other cases: always show navbar
      setShowNavbar(true);
    }
  }, [isDashboard, firstMessageSent, isHovering]);

  // Handler for mouse entering navbar area
  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  // Handler for mouse leaving navbar area
  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar hover area */}
      <div 
        className="absolute top-0 left-0 right-0 h-24 z-40"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Navbar with transition */}
        <div className={`transition-all duration-300 transform ${showNavbar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <Navbar />
        </div>
      </div>

      {/* Add padding to account for the hover area */}
      <div className={`${isDashboard && firstMessageSent ? 'pt-0' : 'pt-20'}`}>
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
      
      {/* Only show footer for non-authenticated users */}
      {!isAuthenticated && <Footer />}
    </div>
  );
};
