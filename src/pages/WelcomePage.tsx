import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Check, FileSpreadsheet } from 'lucide-react';

const WelcomePage = () => {
  const { user, refreshUserData } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await refreshUserData();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error during onboarding:', error);
      setLoading(false);
    }
  };

  // Determine plan-specific details
  const getPlanDetails = () => {
    const planType = user?.planType || 'Demo';
    
    switch(planType) {
      case 'Demo':
        return {
          title: 'Welcome to Your Demo Account!',
          description: 'You\'ve been set up with our Demo plan that includes 50,000 tokens, enough for about 2 Excel generations.',
          features: [
            'Generate Excel spreadsheets',
            'Basic tasks and templates',
            'Try before you buy'
          ]
        };
      case 'Basic':
        return {
          title: 'Welcome to Your Basic Plan!',
          description: 'You now have 1,000,000 tokens to create amazing Excel spreadsheets.',
          features: [
            'Basic tasks and templates',
            'Email support',
            'Download generated files'
          ]
        };
      case 'Plus':
        return {
          title: 'Welcome to Your Plus Plan!',
          description: 'You now have 3,000,000 tokens and access to enhanced features.',
          features: [
            'Enhanced generation mode',
            'Upload custom files and images',
            'All Basic features included'
          ]
        };
      case 'Pro':
        return {
          title: 'Welcome to Your Pro Plan!',
          description: 'You\'re now using our premium plan with 5,000,000 tokens.',
          features: [
            'Priority support and processing',
            'All Plus features included',
            'Maximum power for your Excel needs'
          ]
        };
      default:
        return {
          title: 'Welcome to Zarium!',
          description: 'Your account has been created successfully.',
          features: ['Get started with Excel generation']
        };
    }
  };

  const planDetails = getPlanDetails();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8 mb-8">
            <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 text-center mb-6">
              {planDetails.title}
            </h1>
            
            <p className="text-lg text-emerald-700 dark:text-emerald-300 text-center mb-8">
              {planDetails.description}
            </p>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200 mb-4">
                Your plan includes:
              </h3>
              <ul className="space-y-3">
                {planDetails.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-emerald-700 dark:text-emerald-300">
                    <Check className="h-5 w-5 mr-3 text-emerald-600 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {user?.planType === 'Demo' && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-lg mb-6">
                <p className="text-emerald-700 dark:text-emerald-300">
                  Want more features and tokens? Check out our <a href="/pricing" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline">pricing plans</a>.
                </p>
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={handleContinue}
                disabled={loading}
                className="py-3 px-6 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Go to Dashboard'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;