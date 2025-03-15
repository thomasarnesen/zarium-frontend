import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'react-router-dom';
import { Coins, Clock, Calendar, CreditCard } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import api from '../utils/api';

interface TokenInfo {
  current_tokens: number;
  purchased_tokens: number;
  days_until_reset: number;
  max_tokens: number;
  billing_period_start: string;
  billing_period_end: string;
}

export function TokensPage() {
  const { user, refreshUserData } = useAuthStore();
  const location = useLocation();
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const success = queryParams.get('success');
    const sessionId = queryParams.get('session_id');
    
    if (success === 'true' && sessionId && user?.token) {
      setRefreshing(true);
      console.log("Detected successful payment redirect, refreshing user data...");
      
      
      refreshUserData()
        .then(() => {
          console.log("User data refreshed after successful payment");
          
          window.history.replaceState({}, document.title, location.pathname);
          
          fetchTokenInfo();
        })
        .catch(err => {
          console.error("Failed to refresh user data", err);
          setError("Failed to update token information");
        })
        .finally(() => setRefreshing(false));
    }
  }, [location, user, refreshUserData]);

  const fetchTokenInfo = async () => {
    try {
      console.log("Fetching token info...");
      setLoading(true);
      
      const response = await api.fetch('/user/tokens', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch token info:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        throw new Error('Failed to fetch token information');
      }

      const data = await response.json();
      console.log("Token info received:", data);
      setTokenInfo(data);
    } catch (err) {
      console.error('Error in fetchTokenInfo:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (user?.token && !refreshing) {
      fetchTokenInfo();
    }
  }, []); 

  const handleBuyTokens = async () => {
    try {
      if (!user) {
        setShowAuthModal(true);
        return;
      }

      console.log("Initiating token purchase...");
      const response = await api.fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          isTokenReload: true,
          amount: 1000000,
          successUrl: `${window.location.origin}/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/tokens?success=false`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        console.log("Redirecting to checkout URL:", url);
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating token purchase session:', error);
      setError('Failed to initiate token purchase');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid Date';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              fetchTokenInfo();
            }} 
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          {refreshing && (
            <div className="mb-4 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 p-3 rounded-lg text-center flex items-center justify-center gap-2">
              <div className="animate-spin h-4 w-4 border-b-2 border-emerald-600 dark:border-emerald-400 rounded-full"></div>
              Updating token information...
            </div>
          )}
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-emerald-900 dark:text-emerald-100">
              Token Usage
            </h1>
            <button
              onClick={handleBuyTokens}
              disabled={refreshing}
              className={`px-6 py-2 bg-emerald-800 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-900 dark:hover:bg-emerald-600 transition-colors flex items-center gap-2 ${
                refreshing ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Buy Token Reload
            </button>
          </div>

          <div className="grid gap-6">
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <div className="grid md:grid-cols-2 gap-6">
               
                <div>
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Billing Period
                  </h3>
                  <p className="text-base text-emerald-900 dark:text-emerald-100">
                    {tokenInfo ? (
                      `${formatDate(tokenInfo.billing_period_start)} - ${formatDate(tokenInfo.billing_period_end)}`
                    ) : (
                      'Loading...'
                    )}
                  </p>
                </div>
                
               
                <div>
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Monthly tokens reset in
                  </h3>
                  <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                    {tokenInfo ? `${tokenInfo.days_until_reset} days` : 'Loading...'}
                  </p>
                </div>
              </div>
            </div>

          
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <div className="grid md:grid-cols-2 gap-6">
             
                <div>
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Monthly tokens
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                      {tokenInfo?.current_tokens.toLocaleString()}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      / {tokenInfo?.max_tokens.toLocaleString()}
                    </span>
                  </div>
                </div>


                <div>
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Purchased tokens remaining
                  </h3>
                  <p className="text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
                    {tokenInfo?.purchased_tokens.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          selectedPlan="Token Purchase"
          price="50"
          stripePriceId="price_1Qxz59B9ONdEOi8L930qkATT"
        />
      )}
    </div>
  );
}