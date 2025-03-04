import React from 'react';
import { X } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function PolicyModal({ isOpen, onClose, title, children }: PolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto"
      onClick={(e) => {
        
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="min-h-screen px-4 text-center flex items-center justify-center">
        <div 
          className="relative bg-white dark:bg-gray-800 w-full max-w-4xl rounded-xl p-6 overflow-hidden shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[70vh] pr-6 -mr-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
