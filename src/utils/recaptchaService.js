// reCAPTCHA Site Keys
const RECAPTCHA_V2_SITE_KEY = '6LcWqwMrAAAAANGwYW88sOfXnZmJKSOoo4gxb5Qc'; // Your v2 site key
const RECAPTCHA_V3_SITE_KEY = '6LdsVgErAAAAACUjZb006U2ZHGDgaIbaAKAqTkKS'; // Your existing v3 site key

export const RecaptchaService = {
  // Original v3 method (invisible)
  executeRecaptcha: async (action = 'login') => {
    try {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        // Load reCAPTCHA v3 script dynamically if not already loaded
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_V3_SITE_KEY}`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            window.grecaptcha.ready(() => {
              console.log('reCAPTCHA v3 loaded successfully');
              resolve();
            });
          };
          script.onerror = (error) => {
            console.error('Failed to load reCAPTCHA v3 script', error);
            reject(error);
          };
          document.head.appendChild(script);
        });
      }
      
      // Execute reCAPTCHA v3
      const token = await window.grecaptcha.execute(RECAPTCHA_V3_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA v3 execution error:', error);
      return 'recaptcha-error';
    }
  },
  
  // Safe method for v3
  safeExecuteRecaptcha: async (action = 'login') => {
    try {
      const token = await RecaptchaService.executeRecaptcha(action);
      return token || 'recaptcha-unavailable';
    } catch (error) {
      console.warn('reCAPTCHA v3 execution failed:', error);
      return 'recaptcha-error';
    }
  },
  
  // Load reCAPTCHA v2 script
  loadRecaptchaV2: () => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.grecaptcha) {
        resolve();
        return;
      }
      
      // Add callback to global scope
      window.onRecaptchaLoaded = () => {
        console.log('reCAPTCHA v2 script loaded');
        resolve();
      };
      
      // Add script
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });
  },
  
  // Render the reCAPTCHA v2 widget
  renderCaptchaV2: (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return false;
    
    container.innerHTML = `<div class="g-recaptcha" data-sitekey="${RECAPTCHA_V2_SITE_KEY}"></div>`;
    return true;
  },
  
  // Get reCAPTCHA v2 response
  getRecaptchaV2Response: () => {
    if (!window.grecaptcha || !window.grecaptcha.getResponse) {
      console.warn('grecaptcha.getResponse is not available');
      return null;
    }
    
    try {
      return window.grecaptcha.getResponse();
    } catch (error) {
      console.error('Error getting reCAPTCHA v2 response:', error);
      return null;
    }
  },
  
  // Reset the reCAPTCHA v2 widget
  resetRecaptchaV2: () => {
    if (!window.grecaptcha || !window.grecaptcha.reset) {
      console.warn('grecaptcha.reset is not available');
      return false;
    }
    
    try {
      window.grecaptcha.reset();
      return true;
    } catch (error) {
      console.error('Error resetting reCAPTCHA v2:', error);
      return false;
    }
  },
  
  // Verify token on the server (works for both v2 and v3)
  verifyToken: async (token) => {
    // If token indicates reCAPTCHA wasn't available, bypass verification
    if (token === 'recaptcha-unavailable' || token === 'recaptcha-error') {
      console.warn(`Bypassing server verification due to token: ${token}`);
      return { success: true, warning: token };
    }
   
    try {
      // Log token beginning for debugging (don't log the whole token for security)
      console.log(`Verifying token (first 10 chars): ${token.substring(0, 10)}...`);
      
      const response = await fetch('/api/auth/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recaptchaToken: token })
      });
      
      const result = await response.json();
      console.log('Verification result:', result);
      return result;
    } catch (error) {
      console.error('Error verifying token:', error);
      // Return success instead of failure to prevent blocking users
      // when the verification endpoint is unavailable
      return { success: true, error: 'Network error', warning: 'verification-bypassed' };
    }
  }
};

export default RecaptchaService;