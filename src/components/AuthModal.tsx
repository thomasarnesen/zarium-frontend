import React from 'react';
import { X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
  price?: string;
  stripePriceId?: string;
}

export default function AuthModal({ isOpen, onClose, selectedPlan, price, stripePriceId }: AuthModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSignIn = () => {
    navigate('/login', {
      state: {
        selectedPlan,
        stripePriceId,
        price,
        returnTo: '/subscription'
      }
    });
    onClose();
  };

  const handleRegister = () => {
    navigate('/register', {
      state: {
        selectedPlan,
        stripePriceId,
        price,
        isNewSubscription: true
      }
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200">
            Sign in to Continue
          </h3>
          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-emerald-700 dark:text-emerald-300 mb-2">
              {selectedPlan} Plan
            </p>
            {price && (
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                ${price}/month
              </p>
            )}
          </div>
          
          <p className="text-emerald-700 dark:text-emerald-300">
            To subscribe to the {selectedPlan} plan, please sign in or create an account.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleSignIn}
              className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors flex justify-center items-center"
            >
              Sign in
            </button>
            
            <button
              onClick={handleRegister}
              className="w-full py-2 px-4 rounded-lg bg-white dark:bg-gray-900 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-gray-800 transition-colors flex justify-center items-center border border-emerald-200 dark:border-emerald-800"
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}