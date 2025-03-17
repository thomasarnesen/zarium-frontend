import { Link } from 'react-router-dom';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-emerald-50 dark:bg-gray-900 py-8 mt-auto">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-emerald-800 dark:text-emerald-200 text-sm">
              © {currentYear} Zarium. All rights reserved.
            </span>
          </div>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <Link 
              to="/terms" 
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-sm"
            >
              Terms of Service
            </Link>
            <Link 
              to="/privacy" 
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-sm"
            >
              Privacy Policy
            </Link>
            <Link 
              to="/help" 
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 text-sm"
            >
              Help
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};