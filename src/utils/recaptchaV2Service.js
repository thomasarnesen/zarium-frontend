// recaptchaV2Service.js
export const RecaptchaV2Service = {
    /**
     * Renders the reCAPTCHA v2 widget in the specified container
     * @param {string} containerId - ID of the container element where the widget will be rendered
     * @returns {Promise<number>} - Widget ID or -1 on error
     */
    renderRecaptcha: (containerId) => {
      return new Promise((resolve) => {
        // Wait for reCAPTCHA v2 to be loaded
        if (window.recaptchaV2Loaded && window.grecaptcha) {
          try {
            // Render the widget
            const widgetId = window.grecaptcha.render(containerId, {
              'sitekey': '6LcWqwMrAAAAANGwYW88sOfXnZmJKSOoo4gxb5Qc',
              'theme': 'light'
            });
            resolve(widgetId);
          } catch (error) {
            console.error('Error rendering reCAPTCHA v2:', error);
            resolve(-1);
          }
        } else {
          // If not loaded yet, wait for the loaded event
          const handler = () => {
            window.removeEventListener('recaptchaV2Loaded', handler);
            try {
              // Render the widget
              const widgetId = window.grecaptcha.render(containerId, {
                'sitekey': '6LcWqwMrAAAAANGwYW88sOfXnZmJKSOoo4gxb5Qc',
                'theme': 'light'
              });
              resolve(widgetId);
            } catch (error) {
              console.error('Error rendering reCAPTCHA v2:', error);
              resolve(-1);
            }
          };
          window.addEventListener('recaptchaV2Loaded', handler);
        }
      });
    },
  
    /**
     * Gets the response token from the reCAPTCHA v2 widget
     * @param {number} widgetId - ID of the reCAPTCHA widget
     * @returns {string|null} - reCAPTCHA response token or null on error
     */
    getResponse: (widgetId) => {
      try {
        if (window.grecaptcha) {
          return window.grecaptcha.getResponse(widgetId);
        }
      } catch (error) {
        console.error('Error getting reCAPTCHA v2 response:', error);
      }
      return null;
    },
  
    /**
     * Resets the reCAPTCHA v2 widget
     * @param {number} widgetId - ID of the reCAPTCHA widget
     */
    reset: (widgetId) => {
      try {
        if (window.grecaptcha) {
          window.grecaptcha.reset(widgetId);
        }
      } catch (error) {
        console.error('Error resetting reCAPTCHA v2:', error);
      }
    },
  
    /**
     * Verifies a reCAPTCHA v2 token with the server
     * @param {string} token - reCAPTCHA token to verify
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    verifyToken: async (token) => {
      if (!token) {
        console.error('No reCAPTCHA v2 token provided');
        return { success: false, error: 'No token provided' };
      }
      
      try {
        const response = await fetch('/api/auth/verify-recaptcha-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recaptchaToken: token })
        });
        return await response.json();
      } catch (error) {
        console.error('Error verifying reCAPTCHA v2 token:', error);
        return { success: false, error: 'Network error' };
      }
    }
  };
  
  export default RecaptchaV2Service;