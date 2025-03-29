let recaptchaPromise = null;
let isLoading = false;

/**
 * Loads the reCAPTCHA script only once when needed
 * @returns {Promise<void>} Promise that resolves when reCAPTCHA is loaded
 */
export const loadRecaptchaScript = () => {
  // Return existing promise if already loading or loaded
  if (recaptchaPromise) {
    return recaptchaPromise;
  }

  // Check if already loaded in the page
  if (window.grecaptcha && window.grecaptcha.ready) {
    recaptchaPromise = Promise.resolve();
    return recaptchaPromise;
  }

  // Start loading
  isLoading = true;
  
  // Create a new promise for the loading process
  recaptchaPromise = new Promise((resolve, reject) => {
    // Add the script to the document
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=6LdsVgErAAAAACUjZb006U2ZHGDgaIbaAKAqTkKS';
    script.async = true;
    script.defer = true;
    
    // Handle successful loading
    script.onload = () => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => {
          console.log('reCAPTCHA loaded successfully');
          isLoading = false;
          resolve();
        });
      } else {
        isLoading = false;
        console.error('reCAPTCHA loaded but grecaptcha object not available');
        reject(new Error('reCAPTCHA loaded but not available'));
      }
    };
    
    // Handle loading failure
    script.onerror = () => {
      isLoading = false;
      console.error('Failed to load reCAPTCHA script');
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    
    // Add the script to the document
    document.head.appendChild(script);
  });
  
  return recaptchaPromise;
};
