import React from 'react';
import { Outlet } from 'react-router-dom';
import  NavBar  from './Navbar';
import { ThemeToggle } from './ThemeToggle';

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <div className="fixed bottom-5 right-5 z-50">
        <ThemeToggle />
      </div>
    </div>
  );
}
