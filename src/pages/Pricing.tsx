import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

const PLANS = [
  {
    name: 'Basic',
    price: '9.99',
    period: 'month',
    tokens: '1 000 000 tokens',
    stripePriceId: 'price_1Qxz9yB9ONdEOi8LEzOSHcI7',
    features: [
      'Basic tasks and templates',
      'Email support',
      'Download generated files',
    ]
  },
  {
    name: 'Plus',
    price: '19.99',
    period: 'month',
    tokens: '3 000 000 tokens',
    stripePriceId: 'price_1Qxz9RB9ONdEOi8LNr5vqzL5',
    features: [
      'Everything in Basic, plus:',
      'Access to enhaced mode',
      'Upload custom files and images',
    ]
  },
  {
    name: 'Pro',
    price: '29.99',
    period: 'month',
    tokens: '5 000 000 tokens',
    stripePriceId: 'price_1Qxz7HB9ONdEOi8L2iUxfPCR',
    features: [
      'Everything in Plus, plus:',
      'Priority support',
      'Priority queue',
    ]
  }
];

export default function Pricing() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handlePlanSelect = async (plan) => {
    if (plan.isDemo) {
      
      navigate('/register', { 
        state: { 
          selectedPlan: plan.name,
          isDemo: true
        } 
      });
      return;
    }
    
    if (!user) {
     
      navigate('/register', { 
        state: { 
          selectedPlan: plan.name,
          stripePriceId: plan.stripePriceId,
          price: plan.price
        } 
      });
    } else {
     
      try {
        const response = await api.fetch('/create-checkout-session', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            priceId: plan.stripePriceId,
            planName: plan.name,
            successUrl: `${window.location.origin}/dashboard?success=true`,
            cancelUrl: `${window.location.origin}/pricing?success=false`
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create checkout session');
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
        }
      } catch (error) {
        console.error('Error creating checkout session:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-7xl mx-auto"> 
          
          <div className="text-center mb-16">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Choose Your Plan</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6 text-emerald-800 dark:text-emerald-200">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-emerald-700 dark:text-emerald-300 max-w-2xl mx-auto">
              Start generating professional Excel spreadsheets today.<br />
              Choose the plan that best fits your needs.
            </p>
          </div>

         
          <div className="grid md:grid-cols-3 gap-8"> 
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg"
              >
                <div className="p-8 text-center">
                  <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-4">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-emerald-800 dark:text-emerald-200">
                      ${plan.price}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      /{plan.period}
                    </span>
                  </div>
                  <p className="text-emerald-600 dark:text-emerald-400 mb-6">
                    {plan.tokens}
                  </p>

                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors border border-emerald-900 dark:border-emerald-600 shadow-sm hover:shadow-md"
                  >
                    {user ? 'Upgrade Plan' : 'Get Started'}  
                  </button>
                </div>

                <div className="px-8 pb-8">
                  <div className="pt-6 border-t border-emerald-100 dark:border-emerald-800">
                    <ul className="space-y-4">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center text-emerald-700 dark:text-emerald-300">
                          <Check className="h-5 w-5 mr-3 text-emerald-800 dark:text-emerald-200 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}