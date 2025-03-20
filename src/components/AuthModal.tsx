import React, { useEffect, useRef } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
  price?: string;
  stripePriceId?: string;
  features?: string[]; // Optional list of plan features
}

export default function AuthModal({ 
  isOpen, 
  onClose, 
  selectedPlan = 'Basic', 
  price, 
  stripePriceId,
  features = [] 
}: AuthModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Focus trap inside modal
  useEffect(() => {
    if (!isOpen) return;
    
    // Focus first button when modal opens
    initialFocusRef.current?.focus();
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      // If shifting tab and first element is focused, move to last focusable element
      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
      
      // If tab and last element is focused, move to first focusable element
      else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleTabKey);
    return () => window.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  // Default features based on plan if none provided
  const defaultFeatures: Record<string, string[]> = {
    'Basic': [
      'Generate Excel files with AI',
      'Download generated files',
      '100,000 tokens per month',
      'Access to templates'
    ],
    'Plus': [
      'Everything in Basic',
      '300,000 tokens per month',
      'Upload your own files',
      'Priority support'
    ],
    'Pro': [
      'Everything in Plus',
      '1,000,000 tokens per month',
      'Advanced AI features',
      'API access'
    ],
    'Demo': [
      'Try out Excel generation',
      'Limited tokens',
      'Preview generated files',
      'No credit card required'
    ]
  };
  
  const planFeatures = features.length > 0 ? features : 
    (selectedPlan && defaultFeatures[selectedPlan]) ? defaultFeatures[selectedPlan] : [];
  
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
  
  // Handle click outside modal to close it
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-xl"
      >
        <div className="p-6 border-b border-emerald-100 dark:border-emerald-800 flex justify-between items-center">
          <h3
            id="auth-modal-title" 
            className="text-xl font-semibold text-emerald-800 dark:text-emerald-200"
          >
            Sign in to Continue
          </h3>
          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full p-1"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
       
        <div className="p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 mb-2">
              <span className="text-sm font-medium">{selectedPlan} Plan</span>
            </div>
            {price && (
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                ${price}<span className="text-base font-normal text-emerald-600 dark:text-emerald-400">/month</span>
              </p>
            )}
          </div>
          
          {planFeatures.length > 0 && (
            <div className="space-y-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">Plan includes:</p>
              <ul className="space-y-1">
                {planFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
         
          <p className="text-emerald-700 dark:text-emerald-300">
            To subscribe to the {selectedPlan} plan, please sign in or create an account.
          </p>
         
          <div className="space-y-4">
            <button
              ref={initialFocusRef}
              onClick={handleSignIn}
              className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors flex justify-center items-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Sign in to existing account
            </button>
           
            <button
              onClick={handleRegister}
              className="w-full py-2 px-4 rounded-lg bg-white dark:bg-gray-900 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-gray-800 transition-colors flex justify-center items-center border border-emerald-200 dark:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              Create new account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}