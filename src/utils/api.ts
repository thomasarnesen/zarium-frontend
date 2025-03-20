// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    let retryCount = 0;
    const maxRetries = 2; // Reduced from 3 to avoid excessive retries
    const retryDelay = 1000;
    
    // Special handling for verification endpoints - use more retries for network issues
    const isVerificationEndpoint = endpoint.includes('/verify-code') || endpoint.includes('/send-verification');
    const isCheckoutEndpoint = endpoint.includes('/create-checkout-session');
    const verificationMaxRetries = 1;  // Reduced retries for verification endpoints
  
    console.log(`API Request starting to ${endpoint}`);

    const executeRequest = async (shouldRetry = true): Promise<Response> => {
      try {
        // Get CSRF headers with better error handling
        let csrfHeaders = {};
        try {
          csrfHeaders = await csrfService.getHeaders();
        } catch (csrfError) {
          console.warn('Failed to get CSRF headers, continuing without them:', csrfError);
          // Continue without CSRF headers rather than failing completely
        }
        
        // Add authorization from localStorage if available
        // IMPORTANT: Skip for checkout endpoint during registration
        const storedAuth = localStorage.getItem('authUser');
        let authHeaders = {};
        
        if (storedAuth && !isCheckoutEndpoint) {
          try {
            const authData = JSON.parse(storedAuth);
            if (authData.token) {
              authHeaders = {
                'Authorization': `Bearer ${authData.token}`
              };
            }
          } catch (e) {
            console.warn('Failed to parse stored auth data', e);
          }
        }
        
        const isFormData = options.body instanceof FormData;
        
        // Create optimized fetch options with appropriate cache control
        const fetchOptions: RequestInit = {
          ...options,
          headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            ...authHeaders,
            ...csrfHeaders,
            ...options.headers,  // Important: Let options.headers override standard headers
          },
          credentials: 'include',
          mode: 'cors',
          cache: 'no-store' // Prevent caching
        };
  
        console.log(`Sending request to ${endpoint}`);
        if (process.env.NODE_ENV === 'development') {
          console.log('Request options:', JSON.stringify(fetchOptions, (k, v) => 
            k === 'headers' ? JSON.stringify(v) : v));
        }

        // Create a timeout for long-running requests
        const controller = new AbortController();
        const timeoutMs = endpoint.includes('generate-macro') ? 180000 : 30000; // 3 minutes for generation, 30s for others
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        // Add the signal to fetch options
        fetchOptions.signal = controller.signal;

        // For Excel generation, preemptively refresh the token
        if (endpoint.includes('generate-macro')) {
          try {
            console.log("Preemptively refreshing token before generation...");
            const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              mode: 'cors',
              headers: { 
                ...authHeaders, 
                ...csrfHeaders,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              },
              cache: 'no-store',
              signal: controller.signal
            });
            
            if (refreshResponse.ok) {
              console.log("Token refreshed before generation");
            }
          } catch (error) {
            console.warn('Preemptive token refresh failed:', error);
            // Continue anyway - don't fail the main request because of this
          }
        }

        try {
          const response = await fetch(url, fetchOptions);
          clearTimeout(timeoutId); // Clear timeout on successful response
          
          // Special handling for checkout endpoint
          if (isCheckoutEndpoint && !response.ok) {
            console.error(`Checkout error (${response.status}): ${endpoint}`);
            
            const errorData = await response.json().catch(() => ({ error: "Payment processing failed" }));
            throw new Error(errorData.error || "Payment processing failed");
          }

          // Special handling for verification endpoints
          if (isVerificationEndpoint && !response.ok) {
            console.warn(`Verification endpoint error (${response.status}): ${endpoint}`);
            return response; // Return response even if not OK for verification endpoints
          }

          // Handle auth errors (401/403)
          if (response.status === 401 || response.status === 403) {
            // Don't retry if manually logged out
            if (localStorage.getItem('manualLogout') === 'true') {
              throw new Error(`Auth error: ${response.status}`);
            }

            if (retryCount < maxRetries && shouldRetry) {
              retryCount++;
              console.log(`Auth error, attempt ${retryCount}: Refreshing token...`);
              
              try {
                // Try to refresh token with proper error handling
                const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
                  method: 'POST',
                  credentials: 'include',
                  mode: 'cors',
                  headers: { 
                    ...authHeaders, 
                    ...csrfHeaders,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                  },
                  cache: 'no-store'
                });
                
                if (refreshResponse.ok) {
                  console.log('Token refreshed, retrying request');
                  localStorage.setItem('isAuthenticated', 'true');
                  
                  // Short delay before retry
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  return executeRequest(false); // Only retry once after token refresh
                } else {
                  console.warn(`Token refresh failed with status: ${refreshResponse.status}`);
                }
              } catch (e) {
                console.error('Failed to refresh token:', e);
              }
            }
          }

          return response;
        } catch (fetchError: any) {
          clearTimeout(timeoutId); // Clear timeout to prevent memory leaks
          
          // Check if this was a timeout
          if (fetchError.name === 'AbortError') {
            console.error(`Request to ${endpoint} timed out after ${timeoutMs}ms`);
            throw new Error(`Request timed out. Please try again.`);
          }
          
          throw fetchError; // Re-throw for the outer catch block
        }
      } catch (error: any) {
        // Handle network errors with limited retries
        const effectiveMaxRetries = isVerificationEndpoint ? verificationMaxRetries : maxRetries;
        
        if (shouldRetry && retryCount < effectiveMaxRetries) {
          retryCount++;
          console.log(`Network error, retrying (${retryCount}/${effectiveMaxRetries})...`);
          
          // Use appropriate backoff strategy
          const delay = isVerificationEndpoint 
            ? retryDelay * Math.pow(2, retryCount - 1) // Exponential backoff for verification
            : retryDelay * retryCount; // Linear backoff for others
            
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeRequest(true);
        }
        throw error;
      }
    };

    try {
      const startTime = Date.now();
      const response = await executeRequest();
      console.log(`Request to ${endpoint} completed in ${Date.now() - startTime}ms`);

      // Special handling for verification endpoints
      if (isVerificationEndpoint) {
        if (!response.ok) {
          let errorMessage = response.statusText;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            
            // Enhance error messages for verification endpoints
            if (endpoint.includes('/verify-code')) {
              if (response.status === 400) {
                if (errorMessage.includes('expired')) {
                  errorMessage = 'Verification code has expired. Please request a new code.';
                } else if (errorMessage.includes('invalid') || errorMessage.includes('not found')) {
                  errorMessage = 'Invalid verification code. Please check and try again.';
                }
              } else if (response.status === 429) {
                errorMessage = 'Too many attempts. Please try again later.';
              }
            }
          } catch (parseError) {
            // If JSON parsing fails, use status text with context
            errorMessage = `Verification error: ${response.statusText}`;
          }
          
          console.error(`Verification API error (${response.status}): ${errorMessage}`);
          throw new Error(errorMessage);
        }
      } else if (!response.ok) {
        // Handle other non-OK responses
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // Use status text if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },
  
  // Helper method for direct access to auth token
  getAuthToken: (): string | null => {
    try {
      const storedAuth = localStorage.getItem('authUser');
      if (!storedAuth) return null;
      
      const authData = JSON.parse(storedAuth);
      return authData.token || null;
    } catch (e) {
      console.warn('Error getting auth token:', e);
      return null;
    }
  },
  
  // Special method for handling registration flow
  createRegistrationCheckout: async (
    email: string,
    password: string,
    planType: string,
    priceId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(`${config.apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: priceId,
          planName: planType,
          pendingUserEmail: email,
          pendingUserPassword: password,
          successUrl: `${window.location.origin}/dashboard?success=true&email=${encodeURIComponent(email)}`,
          cancelUrl: `${window.location.origin}/pricing?success=false`
        }),
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId); // Clear timeout

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("Checkout creation failed:", errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      const data = await response.json();
      
      if (!data.url) {
        return {
          success: false,
          error: 'No redirect URL received from server'
        };
      }
      
      return {
        success: true,
        url: data.url
      };
    } catch (error: any) {
      // Special handling for timeout
      if (error.name === 'AbortError') {
        console.error("Checkout request timed out");
        return {
          success: false,
          error: 'Request timed out. Please try again.'
        };
      }
      
      console.error("Checkout creation exception:", error);
      return {
        success: false,
        error: error.message || 'Unknown error creating checkout session'
      };
    }
  },
  
  uploadFile: async (endpoint: string, file: File, additionalData?: Record<string, any>) => {
    // Add /api prefix to all endpoints
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    const formData = new FormData();
    
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }
    
    // Get CSRF headers with better error handling
    let csrfHeaders = {};
    try {
      csrfHeaders = await csrfService.getHeaders();
    } catch (csrfError) {
      console.warn('Failed to get CSRF headers for file upload, continuing without them:', csrfError);
    }
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for uploads
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...csrfHeaders,
          // Let browser set Content-Type with boundary
        },
        body: formData,
        credentials: 'include',
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId); // Clear timeout
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      return response;
    } catch (error: any) {
      // Special handling for timeout
      if (error.name === 'AbortError') {
        throw new Error('File upload timed out. Please try again with a smaller file or better connection.');
      }
      
      console.error('Upload Error:', error);
      throw error;
    }
  }
};

export default api;