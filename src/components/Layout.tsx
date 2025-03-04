import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Navbar />
      <Outlet />
    </div>
  );
}
