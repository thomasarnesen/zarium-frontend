import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Helmet } from 'react-helmet-async';
// @ts-ignore
import { RecaptchaService } from '../utils/recaptchaService';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!user?.token;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Secret key trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q') {
        const selection = window.getSelection();
        if (selection && selection.toString().includes('working quickly to scale')) {
          handleGetStarted();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoggedIn]);

  // Updated handleGetStarted function with more resilient reCAPTCHA implementation
  const handleGetStarted = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // If already logged in, go to dashboard
      if (isLoggedIn) {
        navigate('/dashboard');
        return;
      }
      
      let recaptchaResult: { success: boolean; score?: number } = { success: true };
      
      // Try reCAPTCHA but don't block if it fails
      try {
        // Execute reCAPTCHA verification
        const recaptchaToken = await RecaptchaService.safeExecuteRecaptcha('login_homepage');
        
        // Verify the token with your backend
        recaptchaResult = await RecaptchaService.verifyToken(recaptchaToken);
      } catch (recaptchaError) {
        console.warn('reCAPTCHA error, proceeding anyway:', recaptchaError);
        // Continue with authentication despite reCAPTCHA failures
      }
      
      // Only block if reCAPTCHA explicitly failed with a very low score
      if (!recaptchaResult.success && recaptchaResult.score && recaptchaResult.score < 0.1) {
        setError('Security verification failed. Please try again.');
        setIsLoading(false);
        return;
      }
      
      // Proceed with authentication
      proceedWithAuth();
    } catch (error) {
      console.error('Navigation error:', error);
      setError('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };
  
  const proceedWithAuth = async () => {
    try {
      // Use redirect URL that matches what's configured in Azure portal
      const redirectUri = `${window.location.origin}/auth/callback`;
      
      // Store the current path for redirect after login
      sessionStorage.setItem('authRedirectUrl', '/dashboard');
      
      // Generate secure nonce and state for security
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const state = Math.random().toString(36).substring(2, 15);
      
      // Use Azure CIAM URL format
      const authUrl = `https://zariumai.ciamlogin.com/zariumai.onmicrosoft.com/oauth2/v2.0/authorize`;
      
      const params = new URLSearchParams({
        client_id: 'a0432355-cca6-450f-b415-a4c3c4e5d55b',
        response_type: 'id_token',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        response_mode: 'fragment',
        nonce: nonce,
        state: state,
        prompt: 'login'
      });
      
      const fullUrl = `${authUrl}?${params.toString()}`;
      console.log(`Redirecting to: ${fullUrl}`);
      
      window.location.href = fullUrl;
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Zarium - Server Capacity Expansion</title>
        <meta name="description" content="Zarium is currently expanding our server capacity to better serve our users." />
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4efe9 100%);
            color: #4a4a4a;
            margin: 0;
            padding: 0;
          }
        `}</style>
      </Helmet>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "20px",
        textAlign: "center"
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
          padding: "40px",
          maxWidth: "600px",
          width: "100%"
        }}>
          <div style={{
            fontSize: "42px",
            fontWeight: "bold",
            color: "#057857",
            marginBottom: "20px",
            letterSpacing: "-1px"
          }}>
            Zarium<span style={{ color: "#4a4a4a", opacity: 0.7 }}>.</span>
          </div>
          
          <div style={{
            display: "inline-block",
            padding: "8px 18px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "30px"
          }}>
            Server Capacity Expansion
          </div>
          
          <div style={{
            fontSize: "48px",
            marginBottom: "20px"
          }}>
            🖥️
          </div>
          
          <h1 style={{
            color: "#057857",
            marginBottom: "24px",
            fontSize: "28px"
          }}>
            Expanding Our Server Capacity
          </h1>
          
          <p style={{
            color: "#666",
            lineHeight: "1.7",
            marginBottom: "24px",
            fontSize: "16px"
          }}>
            Due to high demand and increased traffic, we're currently expanding our server capacity to better serve our users. Our team is working to bring Zarium back online with improved performance and stability.
          </p>
          
          <div style={{
            backgroundColor: "#f8fafb",
            borderRadius: "12px",
            padding: "20px",
            margin: "30px 0",
            borderLeft: "4px solid #057857"
          }}>
            <p style={{
              marginBottom: "0",
              fontWeight: "500",
              color: "#666"
            }}>
              Thank you for your interest in Zarium! The unexpected high volume of users has exceeded our current server capacity.
            </p>
          </div>
          
          <p style={{
            color: "#666",
            lineHeight: "1.7",
            marginBottom: "24px",
            fontSize: "16px"
          }}>
            We're <span style={{ userSelect: "all" }}>working quickly to scale</span> our infrastructure to accommodate all users. This temporary maintenance will ensure a smoother, faster experience when you return.
          </p>
          
          <div style={{
            height: "1px",
            backgroundColor: "#eee",
            margin: "30px 0"
          }}></div>
          
          <p style={{
            color: "#666",
            lineHeight: "1.7",
            marginBottom: "24px",
            fontSize: "16px"
          }}>
            <strong>Expected return:</strong> As soon as possible
          </p>
          
          <div style={{
            marginTop: "20px"
          }}>
            <p style={{
              color: "#666",
              lineHeight: "1.7",
              marginBottom: "0",
              fontSize: "16px"
            }}>
              Have questions? <a href="mailto:support@zarium.dev" style={{ color: "#057857", fontWeight: "500", textDecoration: "none" }}>Email support →</a>
            </p>
          </div>
          
          {error && (
            <div style={{ marginTop: "20px", color: "red" }}>{error}</div>
          )}
        </div>
      </div>
    </>
  );
};

export default Home;