export const RecaptchaService = {
  /**
   * Executes reCAPTCHA verification and returns a token
   * @param {string} action - Name of the action being performed (e.g., 'login', 'signup')
   * @returns {Promise<string|null>} - reCAPTCHA token or null on error
   */
  executeRecaptcha: async (action = 'login') => {
    // Use the global function if it exists
    if (typeof window.executeRecaptcha === 'function') {
      return window.executeRecaptcha(action);
    }
    
    // Queue the request if reCAPTCHA is still loading
    if (window.recaptchaQueue) {
      return new Promise((resolve) => {
        window.recaptchaQueue.push({ action, resolve });
      });
    }
    
    // Return a fallback value if reCAPTCHA isn't available
    console.warn('reCAPTCHA not available');
    return 'recaptcha-unavailable';
  },

  /**
   * Safe execution of reCAPTCHA that never fails
   * Returns a special token if reCAPTCHA is unavailable
   * 
   * @param {string} action - Name of the action being performed
   * @returns {Promise<string>} - reCAPTCHA token or error code
   */
  safeExecuteRecaptcha: async (action = 'login') => {
    try {
      const token = await RecaptchaService.executeRecaptcha(action);
      if (token) return token;
      return 'recaptcha-unavailable';
    } catch (error) {
      console.warn('reCAPTCHA execution failed:', error);
      return 'recaptcha-error';
    }
  },

  /**
   * Verifies a reCAPTCHA token with the server
   * 
   * @param {string} token - reCAPTCHA token to verify
   * @returns {Promise<{success: boolean, score?: number, error?: string, warning?: string}>}
   */
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
      // Never block users if verification fails
      return { success: true, error: 'Network error', warning: 'Verification failed but proceeding' };
    }
  }
};

export default RecaptchaService;
