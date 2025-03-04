import React from 'react';
import { CalendarClock, Check } from 'lucide-react';

interface SubscriptionCancelConfirmProps {
  endDate: string;
  onClose: () => void;
}

const SubscriptionCancelConfirm = ({ endDate, onClose }: SubscriptionCancelConfirmProps) => {
  const formattedDate = new Date(endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 text-center mb-4">
          Subscription Cancelled
        </h3>
        
        <div className="text-center mb-6">
          <p className="text-emerald-700 dark:text-emerald-300 mb-4">
            Your subscription has been cancelled successfully. You'll still have access to all features until your current billing period ends.
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            <CalendarClock className="h-4 w-4" />
            <span>Access until {formattedDate}</span>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCancelConfirm;