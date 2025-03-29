let recaptchaPromise = null;
let recaptchaV2Promise = null;
let isLoading = false;
let isLoadingV2 = false;

/**
 * Loads the reCAPTCHA v3 script only once when needed
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
          console.log('reCAPTCHA v3 loaded successfully');
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

/**
 * Loads the reCAPTCHA v2 (checkbox) script only once when needed
 * Uses explicit rendering approach for better control
 * @returns {Promise<void>} Promise that resolves when reCAPTCHA v2 is loaded
 */
export const loadRecaptchaV2Script = () => {
  // Return existing promise if already loading or loaded
  if (recaptchaV2Promise) {
    return recaptchaV2Promise;
  }
  
  // Start loading
  isLoadingV2 = true;
 
  // Create a new promise for the loading process
  recaptchaV2Promise = new Promise((resolve, reject) => {
    // Define the callback function that will be called when reCAPTCHA v2 is loaded
    window.onRecaptchaLoaded = function() {
      console.log('reCAPTCHA v2 loaded successfully');
      isLoadingV2 = false;
      resolve();
    };
    
    // Add the script to the document with explicit render and onload callback
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit';
    script.async = true;
    script.defer = true;
   
    // Handle loading failure
    script.onerror = () => {
      isLoadingV2 = false;
      console.error('Failed to load reCAPTCHA v2 script');
      reject(new Error('Failed to load reCAPTCHA v2 script'));
    };
   
    // Add the script to the document
    document.head.appendChild(script);
  });
 
  return recaptchaV2Promise;
};