import { Outlet } from 'react-router-dom';
import  Navbar  from './Navbar'; // Assuming you have a Navbar component
import { Footer } from './Footer';

export const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};