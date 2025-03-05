import React, { useEffect, useState } from 'react';

interface ApiErrorProps {
  error: string;
  onClose?: () => void;
}

export function ApiError({ error, onClose }: ApiErrorProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (error) {
      setVisible(true);
      // Sett en timer for å fjerne error etter 5 sekunder
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [error, onClose]);

  if (!visible || !error) return null;

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-lg">
      <div className="flex items-center">
        <span className="mr-2">{error}</span>
        <button 
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="text-red-700 hover:text-red-900"
        >
          ×
        </button>
      </div>
    </div>
  );
}
