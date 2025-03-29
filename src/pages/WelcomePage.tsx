import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sparkles, ArrowRight, FileSpreadsheet, Zap, HelpCircle } from 'lucide-react';
import api from '../utils/api';
// @ts-ignore
import { RecaptchaV2Service } from '../utils/recaptchaV2Service';

export default function WelcomePage() {
  const { user, refreshUserData } = useAuthStore();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const recaptchaContainerRef = useRef(null);
  const [recaptchaWidgetId, setRecaptchaWidgetId] = useState(null);

  // Bot detection states
  const [timeStarted, setTimeStarted] = useState<number | null>(null);
  const [mouseMovements, setMouseMovements] = useState(0);
  const [botDetected, setBotDetected] = useState(false);
  const [honeypotData, setHoneypotData] = useState({
    username: '',
    email: '',
    phoneNumber: ''
  });

  // Initialize timestamp when component mounts
  useEffect(() => {
    setTimeStarted(Date.now());
    
    // Track mouse movements
    const handleMouseMove = () => {
      setMouseMovements(prev => prev + 1);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Make sure user data is fresh and redirect if needed
  useEffect(() => {
    const initWelcomePage = async () => {
      try {
        // Refresh user data to ensure it's up to date
        await refreshUserData();
        
        // Check if user is logged in
        if (!user) {
          navigate('/');
          return;
        }
        
        // Check if user already has a display name - if so, redirect to dashboard
        if (user.displayName && user.displayName !== 'unknown') {
          console.log("User already has a display name, redirecting to dashboard");
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error initializing welcome page:", error);
      }
    };
    
    initWelcomePage();
  }, [user, navigate, refreshUserData]);

  // Initialize reCAPTCHA v2 when the component mounts
  useEffect(() => {
    const initRecaptcha = async () => {
      if (recaptchaContainerRef.current) {
        try {
          const widgetId = await RecaptchaV2Service.renderRecaptcha('recaptcha-container');
          if (widgetId !== -1) {
            setRecaptchaWidgetId(widgetId);
            console.log("reCAPTCHA v2 widget initialized with ID:", widgetId);
          } else {
            console.error("Failed to initialize reCAPTCHA v2 widget");
          }
        } catch (error) {
          console.error("Error initializing reCAPTCHA:", error);
        }
      }
    };

    // Initialize reCAPTCHA after a slight delay to ensure the DOM is ready
    const timer = setTimeout(initRecaptcha, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handler for honeypot field changes
  const handleHoneypotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setHoneypotData(prev => ({ ...prev, [name]: value }));
    
    // When any honeypot field is filled, mark as bot
    if (value) {
      setBotDetected(true);
      
      // Report honeypot trigger to backend
      try {
        fetch(`${api.apiUrl}/api/honeypot-trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify({
            honeypotType: 'hidden_field',
            page: 'welcome_page',
            details: { fieldName: name, value }
          })
        });
      } catch (err) {
        // Silent fail - don't alert the bot
        console.error("Error reporting honeypot trigger:", err);
      }
    }
  };

  // Handle admin link click (honeypot link)
  const handleAdminLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setBotDetected(true);
    
    // Report honeypot trigger to backend
    try {
      fetch(`${api.apiUrl}/api/honeypot-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          honeypotType: 'hidden_link',
          page: 'welcome_page',
          details: { linkText: 'Admin Portal Access' }
        })
      });
    } catch (err) {
      // Silent fail - don't alert the bot
      console.error("Error reporting honeypot trigger:", err);
    }
    
    // Continue to dashboard to avoid alerting the bot
    navigate('/dashboard');
  };

  const handleNameSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Please enter what we should call you');
      return;
    }
    
    // Check for bot indicators
    const timeTaken = timeStarted ? Date.now() - timeStarted : 0;
    
    // Bot detection: Too fast form completion, no mouse movements
    if (timeTaken < 1500 || mouseMovements < 5) {
      setBotDetected(true);
      
      // Send behavior analysis to backend
      try {
        fetch(`${api.apiUrl}/api/behavior-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify({
            timeOnPage: Math.floor(timeTaken / 1000),
            mouseMovements: mouseMovements,
            interactionCount: 1,
            typingSpeed: displayName.length / (timeTaken / 1000)
          })
        });
      } catch (err) {
        // Silent fail - don't alert the bot
        console.error("Error sending behavior analysis:", err);
      }
    }
    
    setError('');
    setLoading(true);

    try {
      // Get the reCAPTCHA v2 token
      const recaptchaToken = RecaptchaV2Service.getResponse(recaptchaWidgetId);
      
      if (!recaptchaToken) {
        setError('Please complete the reCAPTCHA verification');
        setLoading(false);
        return;
      }
      
      // Verify the token with your backend - this now includes IP checking
      const verifyResponse = await RecaptchaV2Service.verifyToken(recaptchaToken);
      
      // Check standard success response
      if (!verifyResponse.success) {
        setError('Security verification failed. Please try again.');
        // Reset the reCAPTCHA widget
        RecaptchaV2Service.reset(recaptchaWidgetId);
        setLoading(false);
        return;
      }
      
      // Check for IP limitation flag - NEW CODE
      if (verifyResponse.flag === "ip_limit") {
        setError('This IP address has reached the maximum number of accounts allowed.');
        RecaptchaV2Service.reset(recaptchaWidgetId);
        setLoading(false);
        
        // Optional: Report to the abuse system if this is suspicious
        try {
          await fetch(`${api.apiUrl}/api/report-bot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.token}`
            },
            body: JSON.stringify({
              userId: user?.id,
              detectionSource: 'welcome_page',
              detectionMethod: 'ip_limit_exceeded',
              indicators: {
                ipLimitExceeded: true,
                formCompletionTime: timeTaken,
                mouseMovements: mouseMovements
              }
            })
          });
        } catch (err) {
          console.error("Error reporting IP limit violation:", err);
        }
        
        return;
      }
      
      // If bot detected, report to backend, but continue with normal flow
      if (botDetected) {
        try {
          await fetch(`${api.apiUrl}/api/report-bot`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user?.token}`
            },
            body: JSON.stringify({
              userId: user?.id,
              detectionSource: 'welcome_page',
              detectionMethod: 'form_submission',
              indicators: {
                honeypotFields: honeypotData,
                formCompletionTime: timeTaken,
                mouseMovements: mouseMovements
              }
            })
          });
        } catch (err) {
          // Silent fail - don't alert the bot
          console.error("Error reporting bot:", err);
        }
      }
      
      // Proceed with updating display name
      const response = await fetch(`${api.apiUrl}/api/update-display-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ 
          displayName: displayName.trim(),
          recaptchaToken // Include token for server-side logging
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update display name');
      }

      // Update local storage with new display name
      const userData = await response.json();
      const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      storedUser.displayName = userData.displayName;
      localStorage.setItem('authUser', JSON.stringify(storedUser));

      await refreshUserData();
      
      // Redirect to dashboard after successful name update
      navigate('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Reset the reCAPTCHA widget on error
      RecaptchaV2Service.reset(recaptchaWidgetId);
    } finally {
      setLoading(false);
    }
  };

  // Guard to prevent unnecessary renders
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Honeypot Link - Only bots will see/click this */}
          <a 
            href="/admin-portal" 
            onClick={handleAdminLinkClick}
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden'
            }}
            aria-hidden="true"
            tabIndex={-1}
          >
            Admin Portal Access
          </a>
          
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center px-4 py-2 mb-6 rounded-full bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Welcome to Zarium!</span>
            </div>
            
            <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-6">
              Your Demo Account is Ready
            </h1>
            
            <p className="text-lg text-emerald-700 dark:text-emerald-300 mb-8">
              You now have access to Zarium's Excel generation features with your demo account.
              {/* Show actual token amount, not hardcoded value */}
              You have {user.tokens?.toLocaleString() || '0'} tokens available to try out the platform.
            </p>
          </div>
          
          {/* Account Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-800 p-8 mb-10 shadow-md">
            <div className="flex items-center justify-center mb-6">
              <FileSpreadsheet className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-4 text-center">
              Your Demo Account Details
            </h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-2 border-b border-emerald-100 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300">Plan</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">{user.planType || 'Demo'}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-emerald-100 dark:border-emerald-800">
                <span className="text-emerald-700 dark:text-emerald-300">Available Tokens</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">{user.tokens?.toLocaleString() || '0'}</span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-emerald-700 dark:text-emerald-300">Demo Duration</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">7 days</span>
              </div>
            </div>
            
            {/* Name Input Form - Integrated in the same card */}
            <div className="border-t border-emerald-100 dark:border-emerald-800 pt-6">
              <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-3 text-center">
                What would you like us to call you?
              </h3>
              
              <p className="text-emerald-700 dark:text-emerald-300 mb-5 text-center">
                Please enter your preferred name to personalize your experience.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-200 rounded-lg text-center">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleNameSubmit} className="space-y-4">
                {/* Honeypot fields - invisible to real users */}
                <div 
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    height: 0,
                    width: 0,
                    overflow: 'hidden'
                  }}
                >
                  <input
                    type="text"
                    name="username"
                    value={honeypotData.username}
                    onChange={handleHoneypotChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <input
                    type="email"
                    name="email"
                    value={honeypotData.email}
                    onChange={handleHoneypotChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={honeypotData.phoneNumber}
                    onChange={handleHoneypotChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>
                
                {/* Real visible input */}
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your preferred name"
                  className="w-full px-4 py-3 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  required
                  autoFocus
                />
                
                {/* reCAPTCHA v2 container */}
                <div className="flex justify-center mt-4 mb-4">
                  <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="w-full py-3 px-4 rounded-lg bg-emerald-800 dark:bg-emerald-700 text-white hover:bg-emerald-900 dark:hover:bg-emerald-600 disabled:opacity-70 transition-colors flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Verifying...' : 'Start Using Zarium'}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
          
          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                Generate Excel Files
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300">
                Create professional Excel spreadsheets by describing what you need in plain language.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                Preview Results
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300">
                See what your AI-generated Excel files look like before downloading them.
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all border border-emerald-100 dark:border-emerald-800">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-800 dark:text-emerald-200 mb-4">
                <HelpCircle className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-emerald-800 dark:text-emerald-200">
                Get Help
              </h3>
              <p className="text-emerald-700 dark:text-emerald-300">
                Access our help documentation to get the most out of your Zarium experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}