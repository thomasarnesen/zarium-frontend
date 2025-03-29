import { loadRecaptchaScript, loadRecaptchaV2Script } from './recaptchaLoader';

// reCAPTCHA Site Keys
const RECAPTCHA_V2_SITE_KEY = '6LcWqwMrAAAAANGwYW88sOfXnZmJKSOoo4gxb5Qc'; // Your v2 site key
const RECAPTCHA_V3_SITE_KEY = '6LdsVgErAAAAACUjZb006U2ZHGDgaIbaAKAqTkKS'; // Your existing v3 site key

// Track the rendered reCAPTCHA widget ID
let recaptchaWidgetId = null;

export const RecaptchaService = {
  // Original v3 method (invisible)
  executeRecaptcha: async (action = 'login') => {
    try {
      // Load the script if needed
      await loadRecaptchaScript();
     
      // Execute reCAPTCHA
      return await window.grecaptcha.execute(RECAPTCHA_V3_SITE_KEY, { action });
    } catch (error) {
      console.error('reCAPTCHA execution error:', error);
      return 'recaptcha-error';
    }
  },
  
  // Original safe method for v3
  safeExecuteRecaptcha: async (action = 'login') => {
    try {
      const token = await RecaptchaService.executeRecaptcha(action);
      return token || 'recaptcha-unavailable';
    } catch (error) {
      console.warn('reCAPTCHA execution failed:', error);
      return 'recaptcha-error';
    }
  },
  
  // New method to render the reCAPTCHA v2 checkbox challenge
  renderRecaptchaV2: async (containerId) => {
    try {
      // Load the reCAPTCHA v2 script
      await loadRecaptchaV2Script();
      
      // Ensure grecaptcha is loaded
      if (!window.grecaptcha || !window.grecaptcha.render) {
        console.error('grecaptcha.render is not available');
        return false;
      }
      
      // Clear any existing widget
      if (recaptchaWidgetId !== null && window.grecaptcha && window.grecaptcha.reset) {
        try {
          window.grecaptcha.reset(recaptchaWidgetId);
        } catch (e) {
          console.warn('Failed to reset reCAPTCHA widget', e);
        }
      }
      
      // Render the reCAPTCHA widget with explicit rendering
      recaptchaWidgetId = window.grecaptcha.render(containerId, {
        'sitekey': RECAPTCHA_V2_SITE_KEY,
        'theme': 'light',
        'size': 'normal',
        'callback': (token) => {
          console.log('reCAPTCHA verified');
          // Optional: You can store the token or trigger an event here
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          // Optional: Handle expired captcha
        },
        'error-callback': () => {
          console.error('reCAPTCHA error');
          // Optional: Handle error
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to render reCAPTCHA v2:', error);
      return false;
    }
  },
  
  // Get the response from reCAPTCHA v2
  getRecaptchaV2Response: () => {
    if (!window.grecaptcha) {
      console.warn('grecaptcha is not available');
      return null;
    }
    
    try {
      return window.grecaptcha.getResponse(recaptchaWidgetId);
    } catch (error) {
      console.error('Error getting reCAPTCHA v2 response:', error);
      return null;
    }
  },
  
  // Reset the reCAPTCHA v2 widget
  resetRecaptchaV2: () => {
    if (!window.grecaptcha) {
      console.warn('grecaptcha is not available');
      return false;
    }
    
    try {
      window.grecaptcha.reset(recaptchaWidgetId);
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
      const response = await fetch('/api/auth/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recaptchaToken: token })
      });
      return await response.json();
    } catch (error) {
      console.error('Error verifying token:', error);
      // Return success instead of failure to prevent blocking users
      // when the verification endpoint is unavailable
      return { success: true, error: 'Network error', warning: 'verification-bypassed' };
    }
  }
};

export default RecaptchaService;