import React from 'react';
import { Outlet } from 'react-router-dom';
import  NavBar  from './Navbar';


export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBar />
      <main className="flex-grow">
        <Outlet />
      </main>

    </div>
  );
}
