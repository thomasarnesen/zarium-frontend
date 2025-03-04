import React from 'react';
import { FileSpreadsheet, Construction } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center space-x-4">
          <FileSpreadsheet className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
          <Construction className="h-12 w-12 text-emerald-500 dark:text-emerald-300" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-emerald-800 dark:text-emerald-200">
          Coming Soon
        </h2>
        <p className="mt-4 text-center text-lg text-emerald-600 dark:text-emerald-300">
          We're working hard to bring you the best Excel generation platform.
          Stay tuned!
        </p>
        <div className="mt-8">
          <a
            href="mailto:contact@example.com"
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors"
          >
            Contact us for early access
          </a>
        </div>
      </div>
    </div>
  );
}