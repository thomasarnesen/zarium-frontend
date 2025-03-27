
export const RecaptchaService = {
  /**
   * Executes reCAPTCHA verification and returns a token
   * @param {string} action - Name of the action being performed (e.g., 'login', 'signup')
   * @returns {Promise<string|null>} - reCAPTCHA token or null on error
   */
  executeRecaptcha: async (action = 'login') => {
    // Check if reCAPTCHA is available
    if (!window.grecaptcha) {
      console.error('reCAPTCHA is not loaded');
      return null;
    }

    // Use the global executeRecaptcha function if available
    if (typeof window.executeRecaptcha === 'function') {
      return window.executeRecaptcha(action);
    }

    // Fallback to standard grecaptcha API
    try {
      return new Promise((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute('6LdsVgErAAAAACUjZb006U2ZHGDgaIbaAKAqTkKS', { action })
            .then(resolve)
            .catch(error => {
              console.error('reCAPTCHA execution error:', error);
              reject(error);
            });
        });
      });
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      return null;
    }
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
   * @returns {Promise<{success: boolean, score?: number, error?: string}>}
   */
  verifyToken: async (token) => {
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
      return { success: false, error: 'Network error' };
    }
  }
};

export default RecaptchaService;
