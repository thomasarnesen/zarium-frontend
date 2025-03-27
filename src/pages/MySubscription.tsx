import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Sparkles, Coins } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SubscriptionCancelConfirm from '../components/SubscriptionCancelConfirm';
import api from '../utils/api';

interface Plan {
  name: string;
  price: string;
  period: string;
  tokens: string;
  stripePriceId: string;
  features: string[];
}


const PLAN_RANKS: { [key in 'Basic' | 'Plus' | 'Pro' | 'Demo']: number } = {
  'Basic': 0,
  'Plus': 1,
  'Pro': 2,
  'Demo': -1
};

// Removing the unused PLAN_TOKENS constant

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

export function MySubscription() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>(user?.planType || 'Basic');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'canceling' | 'none'>('none');
  const [tokenInfo, setTokenInfo] = useState<{
    current_tokens: number;
    max_tokens: number;
    days_until_reset: number;
  } | null>(null);
  const [pendingPlanChange, setPendingPlanChange] = useState<string | null>(null);
  const [pendingPlanDate, setPendingPlanDate] = useState<string | null>(null);
  const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);
  const [targetPlan, setTargetPlan] = useState<string | null>(null);
  const [originalPlan, setOriginalPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const response = await api.fetch('/verify-token', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Verify token response:", data);  // Legg til logging for debugging
          
          setCurrentPlan(data.planType);
          setOriginalPlan(data.planType);
          
          // Håndter subscription status med fallback
          const status = data.subscriptionStatus || (data.planType === 'Demo' ? 'none' : 'active');
          setSubscriptionStatus(status);
          
          // Håndter plan endring
          setPendingPlanChange(data.pendingPlanChange || null);
          setPendingPlanDate(data.pendingPlanChangeDate || null);
          
          // Håndter sluttdato
          if (data.subscriptionEndDate) {
            setSubscriptionEndDate(data.subscriptionEndDate);
          }
          
          // Logg subscription info for debugging
          console.log("Subscription status:", status);
          console.log("Subscription end date:", data.subscriptionEndDate);
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error);
      }
    };

    if (user?.token) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const response = await api.fetch('/user/tokens', {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setTokenInfo(data);
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    if (user?.token) {
      fetchTokenInfo();
    }
  }, [user]);
  const currentPlanRank = PLAN_RANKS[(currentPlan as keyof typeof PLAN_RANKS) || 'Basic'];

  const handleBuyTokens = async () => {
    if (!user || !user.token) return;
    
    try {
      const response = await api.fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          isTokenReload: true,
          successUrl: `${window.location.origin}/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/tokens?success=false`
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
  
      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        console.error('No URL returned from checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  interface CheckoutSessionResponse {
    url: string;
  }

  const handleUpgrade = async (plan: Plan): Promise<void> => {
    if (!user || !user.token) return;
    
    try {
      const response = await api.fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planName: plan.name,
        }),
      });

      const { url } = await response.json() as CheckoutSessionResponse;
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setCancelError(null);

    if (!user || !user.token) return;
    
    try {
      const response = await api.fetch('/cancel-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const data = await response.json();
      setSubscriptionEndDate(data.cancelDate);
      setSubscriptionStatus('canceling');
      setShowCancelConfirm(false);
      setShowCancelSuccess(true);
    } catch (error) {
      setCancelError('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCancelLoading(false);
    }
  };

  const getTokenResetMessage = () => {
    if (!tokenInfo) return "Loading...";
    
    if (subscriptionStatus === 'canceling') {
      return `${user?.tokens?.toLocaleString()} tokens left. Service ends in ${tokenInfo.days_until_reset} days`;
    }
    
    return `${user?.tokens?.toLocaleString()} tokens left. Reset to ${tokenInfo.max_tokens.toLocaleString()} in ${tokenInfo.days_until_reset} days`;
  };

  const handleReactivate = async () => {
    if (!user || !user.token) return;
    
    try {
      const response = await api.fetch('/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      await response.json(); // Parse the response but don't store it
      setSubscriptionStatus('active');
      setShowReactivateConfirm(false);
      
      // Refresh token info after reactivation
      const fetchTokenInfo = async () => {
        try {
          const response = await api.fetch('/user/tokens', {
            headers: {
              'Authorization': `Bearer ${user?.token}`,
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setTokenInfo(data);
          }
        } catch (error) {
          console.error('Error fetching token info:', error);
        }
      };
      fetchTokenInfo();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    }
  };

  const handlePlanChange = async (plan: any, isDowngrade: boolean) => {
    if (isDowngrade) {
      setTargetPlan(plan.name);
      setShowDowngradeConfirm(true);
      return;
    }
    await handleUpgrade(plan);
  };

  const confirmDowngrade = async () => {
    if (!targetPlan) return;
    
    try {
      const response = await api.fetch('/schedule-plan-change', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newPlan: targetPlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to schedule plan change');
      }

      await response.json(); // Parse the response but don't store it
      setPendingPlanChange(targetPlan);
      setShowDowngradeConfirm(false);
    } catch (error) {
      console.error('Error scheduling plan change:', error);
    }
  };

  const handleCancelPlanChange = async () => {
    try {
      const response = await api.fetch('/cancel-plan-change', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel plan change');
      }

      setPendingPlanChange(null);
      setPendingPlanDate(null);
    } catch (error) {
      console.error('Error canceling plan change:', error);
    }
  };

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center px-4 py-2 mb-8 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">My Subscription</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-6 text-emerald-800 dark:text-emerald-200">
            Manage Your Subscription
          </h1>
          <p className="text-lg text-emerald-700 dark:text-emerald-300 max-w-2xl mx-auto">
            Current plan: <span className="font-semibold">{currentPlan}</span>
          </p>
        </div>

        
        {currentPlan !== 'Demo' && (
          <div className="mb-12 bg-black/5 dark:bg-white/5 rounded-lg p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-800 dark:text-emerald-200">
                {getTokenResetMessage()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 dark:text-emerald-300">
                Need more tokens?
              </span>
              <button
                onClick={handleBuyTokens}
                className={`px-6 py-2 bg-emerald-800 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2`}
  
              >
                <Coins className="h-4 w-4" />
                Buy 1M Token Reload
              </button>
            </div>
          </div>
        )}

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">  
          {PLANS.map((plan) => {
            const planRank = PLAN_RANKS[plan.name as keyof typeof PLAN_RANKS] || 0;
            const isCurrentPlan = plan.name === currentPlan;
            const canUpgrade = plan.name !== 'Demo' && planRank > currentPlanRank;
            const canDowngrade = plan.name !== 'Demo' && planRank < currentPlanRank && subscriptionStatus === 'active';
            const isPendingChange = pendingPlanChange === plan.name;

            return (
              <div
                key={plan.name}
                className={`relative w-full max-w-sm bg-white/60 dark:bg-gray-800/50 rounded-xl border 
                  ${isCurrentPlan 
                    ? 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500 dark:ring-emerald-400' 
                    : 'border-emerald-100 dark:border-emerald-800'} 
                  overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <Crown className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
                  </div>
                )}
                
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

                  {isCurrentPlan ? (
                    <div className="w-full py-3 px-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 cursor-default border border-emerald-200 dark:border-emerald-800">
                      Current Plan
                    </div>
                  ) : isPendingChange ? (
                    <div className="w-full flex flex-col gap-2">
                      <div className="py-3 px-4 rounded-lg bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 cursor-default border border-orange-200 dark:border-orange-800">
                        <p>Activating {pendingPlanDate ? new Date(pendingPlanDate).toLocaleDateString() : 'at end of period'}</p>
                      </div>
                      <button
                        onClick={handleCancelPlanChange}
                        className="w-full py-2 px-4 text-sm bg-orange-200 hover:bg-orange-300 dark:bg-orange-800 dark:hover:bg-orange-700 text-orange-800 dark:text-orange-200 rounded-lg transition-colors"
                      >
                        Keep {originalPlan} Plan
                      </button>
                    </div>
                  ) : currentPlan === 'Demo' && plan.name !== 'Demo' ? (
                    <button
                      onClick={() => handlePlanChange(plan, false)}
                      className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors border border-emerald-900 dark:border-emerald-600 shadow-sm hover:shadow-md"
                    >
                      Upgrade Plan
                    </button>
                  ) : canUpgrade ? (
                    <button
                      onClick={() => handlePlanChange(plan, false)}
                      className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors border border-emerald-900 dark:border-emerald-600 shadow-sm hover:shadow-md"
                    >
                      Upgrade Plan
                    </button>
                  ) : canDowngrade ? (
                    <button
                      onClick={() => handlePlanChange(plan, true)}
                      className="w-full py-3 px-4 rounded-lg bg-gray-800 dark:bg-gray-700 text-white hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors border border-gray-900 dark:border-gray-600 shadow-sm hover:shadow-md"
                    >
                      Downgrade Plan
                    </button>
                  ) : null}
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
            );
          })}
        </div>

       
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Cancellation
            </h3>
            <div className="mt-4">
              {subscriptionStatus === 'canceling' ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-700 dark:text-gray-300">
                      Subscription Status
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      Your subscription has been cancelled and will end on {subscriptionEndDate ? new Date(subscriptionEndDate).toLocaleDateString() : 'the end of billing period'}
                    </p>
                    <button
                      onClick={() => setShowReactivateConfirm(true)}
                      className="mt-2 px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      Reactivate Subscription
                    </button>
                  </div>
                  <div className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-lg">
                    Ending Soon
                  </div>
                </div>
              ) : currentPlan === 'Demo' || !currentPlan ? (
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 dark:text-gray-300">
                    No active subscription
                  </p>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 rounded-lg">
                    Inactive
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-700 dark:text-gray-300">
                    Cancel plan
                  </p>
                  {!showCancelConfirm ? (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Keep
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                        className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {cancelLoading ? 'Cancelling...' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {cancelError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {cancelError}
                </p>
              )}
            </div>
          </div>
        </div>

        
        {showCancelSuccess && subscriptionEndDate && (
          <SubscriptionCancelConfirm
            endDate={subscriptionEndDate}
            onClose={() => setShowCancelSuccess(false)}
          />
        )}

        
        {showReactivateConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-4">
                Reactivate Subscription
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Would you like to reactivate your subscription? Your service will continue uninterrupted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReactivateConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReactivate}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Reactivate
                </button>
              </div>
            </div>
          </div>
        )}

        
        {showDowngradeConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-4">
                Confirm Plan Change
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your plan will be changed to {targetPlan} at the end of your current billing period. 
                You'll continue to have access to your current plan's features until then.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDowngradeConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDowngrade}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Confirm Change
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
