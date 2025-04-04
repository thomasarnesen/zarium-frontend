import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FileSpreadsheet, Sparkles } from 'lucide-react';
import { PolicyModal } from '../components/PolicyModal';
import { TermsContent } from '../components/TermsContent';
import { PrivacyContent } from '../components/PrivacyContent';
import api from '../utils/api';
import SocialLogin from '../components/SocialLogin';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptNewsletter, setAcceptNewsletter] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [verificationError, setVerificationError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { register, markVerificationComplete, setUser } = useAuthStore();

  // Get parameters from location state
  const selectedPlan = location.state?.selectedPlan || 'Demo'; // Default to Demo if not specified
  const stripePriceId = location.state?.stripePriceId;
  const price = location.state?.price;
  const isDemo = location.state?.isDemo || selectedPlan === 'Demo';
  const skipPayment = location.state?.skipPayment || false;

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    return null;
  };

  interface DemoUserRegistrationRequest {
    email: string;
    password: string;
    plan_type: string;
    skipPayment: boolean;
  }

  interface UserData {
    id: string;
    email: string;
    [key: string]: any; // For other potential user properties
  }

  interface LoginResponse extends UserData {
    token: string;
    planType: 'Demo' | 'Basic' | 'Plus' | 'Pro';
    [key: string]: any; // For other potential properties
  }

  const createDemoUser = async (email: string, password: string): Promise<UserData> => {
    try {
      const response = await api.fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          password,
          plan_type: 'Demo',
          skipPayment: true
        } as DemoUserRegistrationRequest),
      });

      if (!response.ok) {
        const data: { error?: string } = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const userData: UserData = await response.json();
      
      // Create access token directly and log the user in
      const loginResponse = await api.fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!loginResponse.ok) {
        throw new Error('Login failed after registration');
      }

      const userWithToken: LoginResponse = await loginResponse.json();
      
      // Set user data in auth store with id converted to number
      setUser({
        ...userWithToken,
        id: parseInt(userWithToken.id, 10)
      });
      
      // Store in local storage
      localStorage.setItem('authUser', JSON.stringify(userWithToken));
      localStorage.setItem('isAuthenticated', 'true');
      
      // Direct to welcome page
      navigate('/welcome');
      
      return userData;
    } catch (error) {
      console.error('Error creating demo user:', error);
      throw error;
    }
  };

  // Define interfaces for API responses and requests
  interface CheckEmailResponse {
    exists: boolean;
    message?: string;
  }

  interface ApiError {
    error?: string;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    
    // Password validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    if (!acceptTerms || !acceptPrivacy) {
      setError('You must accept both Terms of Service and Privacy Policy to continue');
      return;
    }
    
    setLoading(true);
    
    try {
      // First check if email already exists
      try {
        const checkResponse = await api.fetch('/api/register/check-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        const checkData: CheckEmailResponse = await checkResponse.json();
        
        if (checkData && checkData.exists) {
          setError('An account with this email already exists. Please login instead.');
          setLoading(false);
          return;
        }
      } catch (checkError) {
        // If the endpoint doesn't exist yet, continue with the regular flow
        console.warn('Email check failed, continuing with registration attempt:', checkError);
      }
      
      // For demo accounts with skipPayment flag, create user directly
      if (isDemo && skipPayment) {
        try {
          await createDemoUser(email, password);
          // User will be redirected in the createDemoUser function
          return;
        } catch (error: unknown) {
          setError(error instanceof Error ? error.message : 'Failed to create demo account');
          setLoading(false);
          return;
        }
      }
      
      // For non-demo accounts or when not skipping payment, continue with regular flow
      // Store the registration details in AuthStore first
      await register(email, password, selectedPlan);
      
      // Proceed with sending verification code
      const verifyResponse = await api.fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!verifyResponse.ok) {
        const responseData: ApiError = await verifyResponse.json().catch(() => ({}));
        
        // Handle specific error cases
        if (responseData.error && responseData.error.includes('already exists')) {
          throw new Error('An account with this email already exists. Please login instead.');
        } else {
          throw new Error(responseData.error || 'Failed to send verification code');
        }
      }
      
      // Success - show verification form
      setSentEmail(email);
      setShowVerification(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error sending verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Define interfaces for clarity
  interface VerifyResponse {
    success?: boolean;
    error?: string;
  }

  interface CheckoutResult {
    success: boolean;
    url?: string;
    error?: string;
  }

  const handleVerifyAndRegister = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setVerificationError('');
    setLoading(true);
    
    try {
      // Verify the code first
      const verifyResponse = await api.fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: sentEmail,
          code: verificationCode
        }),
      });

      if (verifyResponse.ok) {
        // Mark verification as complete in the store
        markVerificationComplete();
        
        // Demo accounts should bypass payment
        if (isDemo && skipPayment) {
          try {
            await createDemoUser(sentEmail, password);
            return;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create demo account';
            setVerificationError(errorMessage);
            setLoading(false);
            return;
          }
        }
        
        // Get the price ID for this plan
        const priceId: string | undefined = isDemo 
          ? location.state?.demoPriceId
          : stripePriceId;
        
        // If price ID is undefined, provide a fallback or handle the error
        if (!priceId) {
          throw new Error('Price ID is required for checkout');
        }
        
        console.log(`Creating checkout session with plan: ${selectedPlan}, price: ${priceId}`);
        
        // Use the direct checkout method
        const checkoutResult: CheckoutResult = await api.createRegistrationCheckout(
          sentEmail,
          password,
          selectedPlan,
          priceId
        );
        
        if (checkoutResult.success && checkoutResult.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutResult.url;
        } else {
          // Handle checkout creation failure
          console.error("Failed to create checkout session:", checkoutResult.error);
          setVerificationError(checkoutResult.error || 'Failed to process payment. Please try again.');
        }
      } else {
        // Handle verification failure
        try {
          const errorData: VerifyResponse = await verifyResponse.json();
          setVerificationError(errorData.error || 'Verification failed');
        } catch (parseError) {
          setVerificationError('Verification failed. Please check your code and try again.');
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setVerificationError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 mb-6">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 mb-4">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {selectedPlan} Plan {isDemo ? '- Free' : price && `- $${price}/month`}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">
              Create your account
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-800 dark:text-emerald-200 hover:text-emerald-900 dark:hover:text-emerald-100">
                Sign in
              </Link>
            </p>
          </div>

          <div className="bg-white/60 dark:bg-gray-800/50 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8">
            {!showVerification ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-center">
                    {error}
                  </div>
                )}
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                    placeholder="Enter your password"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                    placeholder="Confirm your password"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={acceptTerms && acceptPrivacy}
                        onChange={(e) => {
                          setAcceptTerms(e.target.checked);
                          setAcceptPrivacy(e.target.checked);
                        }}
                        className="w-4 h-4 border-gray-300 rounded text-emerald-600 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300">
                        I have read and accept the{' '}
                        <button
                          type="button"
                          onClick={() => setShowTerms(true)}
                          className="text-emerald-600 hover:text-emerald-500 underline"
                        >
                          Terms of Service
                        </button>
                        {' '}and{' '}
                        <button
                          type="button"
                          onClick={() => setShowPrivacy(true)}
                          className="text-emerald-600 hover:text-emerald-500 underline"
                        >
                          Privacy Policy
                        </button>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="newsletter"
                        type="checkbox"
                        checked={acceptNewsletter}
                        onChange={(e) => setAcceptNewsletter(e.target.checked)}
                        className="w-4 h-4 border-gray-300 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="newsletter" className="text-sm text-gray-700 dark:text-gray-300">
                        I would like to receive updates about new features and improvements
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !(acceptTerms && acceptPrivacy)}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors border border-emerald-900 dark:border-emerald-600"
                >
                  {loading ? 'Creating account...' : (isDemo ? 'Create Free Account' : 'Continue to payment')}
                </button>
                
                <div className="mt-4">
                  <p className="text-center text-sm text-emerald-600 dark:text-emerald-400 mb-3">
                    Or continue with social login
                  </p>
                  <SocialLogin 
                    mode="register"
                    onLoginStart={() => setLoading(true)}
                    onLoginError={(error) => {
                      setLoading(false);
                      setError(error.message);
                    }}
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/50 p-4 rounded-lg">
                  <p className="text-emerald-800 dark:text-emerald-200">
                    We've sent a verification code to <strong>{sentEmail}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  {verificationError && (
                    <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 px-4 py-3 rounded-lg text-center">
                      {verificationError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="verificationCode" className="block text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
                      Enter Verification Code
                    </label>
                    <input
                      id="verificationCode"
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                      placeholder="Enter the 6-digit code"
                    />
                    
                    <div className="mt-2 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setVerificationError('');
                            const response = await api.fetch('/api/send-verification', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ email: sentEmail }),
                            });
                            
                            if (response.ok) {
                              setVerificationError('Verification code resent. Please check your email.');
                            } else {
                              throw new Error('Failed to resend code');
                            }
                          } catch (error) {
                            setVerificationError('Failed to resend verification code. Please try again.');
                          }
                        }}
                        className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                      >
                        Resend code
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-2 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Verifying...' : 'Complete Registration'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <PolicyModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
      >
        <TermsContent />
      </PolicyModal>

      <PolicyModal
        isOpen={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
      >
        <PrivacyContent />
      </PolicyModal>
    </div>
  );
}