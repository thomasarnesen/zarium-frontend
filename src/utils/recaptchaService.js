import { loadRecaptchaScript } from './recaptchaLoader';

export const RecaptchaService = {
  executeRecaptcha: async (action = 'login') => {
    try {
      // Load the script if needed
      await loadRecaptchaScript();
      
      // Execute reCAPTCHA
      return await window.grecaptcha.execute('6LdsVgErAAAAACUjZb006U2ZHGDgaIbaAKAqTkKS', { action });
    } catch (error) {
      console.error('reCAPTCHA execution error:', error);
      return 'recaptcha-error';
    }
  },

  safeExecuteRecaptcha: async (action = 'login') => {
    try {
      const token = await RecaptchaService.executeRecaptcha(action);
      return token || 'recaptcha-unavailable';
    } catch (error) {
      console.warn('reCAPTCHA execution failed:', error);
      return 'recaptcha-error';
    }
  },

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