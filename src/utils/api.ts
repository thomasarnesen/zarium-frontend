// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    
    // Special handling for verification endpoints - use more retries for network issues
    const isVerificationEndpoint = endpoint.includes('/verify-code') || endpoint.includes('/send-verification');
    const isCheckoutEndpoint = endpoint.includes('/create-checkout-session');
    const verificationMaxRetries = 2;  // Reduced retries for verification - only retry for network errors
  
    const executeRequest = async (shouldRetry = true): Promise<Response> => {
      try {
        // Get CSRF headers FIRST
        let csrfHeaders = {};
        try {
          csrfHeaders = await csrfService.getHeaders();
        } catch (csrfError) {
          console.warn('Failed to get CSRF headers:', csrfError);
        }
        
        // Add authorization from localStorage if available
        const storedAuth = localStorage.getItem('authUser');
        let authHeaders = {};
        
        if (storedAuth) {
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
        
        const fetchOptions: RequestInit = {
          ...options,
          headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Accept': 'application/json',
            ...authHeaders,
            ...csrfHeaders,
            ...options.headers,  // Important: Let options.headers override standard headers
          },
          credentials: 'include',
          mode: 'cors'
        };
  
        console.log(`Sending request to ${endpoint}`);
        if (process.env.NODE_ENV === 'development') {
          console.log('Request options:', fetchOptions);
        }

        // For Excel generation, preemptively refresh the token
        if (endpoint.includes('generate-macro')) {
          try {
            console.log("Preemptively refreshing token before generation...");
            const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              mode: 'cors',
              headers: { ...authHeaders, ...csrfHeaders }
            });
            
            if (refreshResponse.ok) {
              console.log("Token refreshed before generation");
            }
          } catch (error) {
            console.warn('Preemptive token refresh failed:', error);
          }
        }

        const response = await fetch(url, fetchOptions);

        // Special handling for checkout endpoint - prioritize reliability
        if (isCheckoutEndpoint && !response.ok) {
          console.error(`Checkout error (${response.status}): ${endpoint}`);
          
          // For checkout, we want proper error messages
          const errorData = await response.json().catch(() => ({ error: "Payment processing failed" }));
          throw new Error(errorData.error || "Payment processing failed");
        }

        // Special handling for verification endpoints
        if (isVerificationEndpoint && !response.ok) {
          console.warn(`Verification endpoint error (${response.status}): ${endpoint}`);
          
          // For verification endpoints, we want to return the response even if not OK
          // so we can extract the error message - no retries for validation errors
          return response;
        }

        // Re-authenticate on 401/403 errors
        if (response.status === 401 || response.status === 403) {
          // If we received a 401/403 error and we manually logged out, don't try to refresh token
          if (localStorage.getItem('manualLogout') === 'true') {
            // Just abort - don't try to refresh token
            throw new Error(`Auth error: ${response.status}`);
          }

          if (retryCount < maxRetries && shouldRetry) {
            retryCount++;
            console.log(`Auth error, attempt ${retryCount}: Refreshing token...`);
            
            try {
              const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors',
                headers: { ...authHeaders, ...csrfHeaders }
              });
              
              if (refreshResponse.ok) {
                console.log('Token refreshed, retrying request');
                // Update isAuthenticated in localStorage
                localStorage.setItem('isAuthenticated', 'true');
                return executeRequest(false);
              }
            } catch (e) {
              console.error('Failed to refresh token:', e);
            }
          }
          
          // If we're still having auth issues after retries, consider clearing auth
          if (retryCount >= maxRetries) {
            console.error('Authentication failed after maximum retries');
            // Don't automatically redirect - let the component handle it
          }
        }

        return response;
      } catch (error) {
        // For network errors (not HTTP errors like 400, 401, etc)
        const effectiveMaxRetries = isVerificationEndpoint ? verificationMaxRetries : maxRetries;
        
        if (shouldRetry && retryCount < effectiveMaxRetries) {
          retryCount++;
          console.log(`Network error, retrying (${retryCount}/${effectiveMaxRetries})...`);
          
          // Use exponential backoff for verification endpoints
          const delay = isVerificationEndpoint 
            ? retryDelay * Math.pow(2, retryCount - 1) // Exponential backoff
            : retryDelay * retryCount; // Linear backoff
            
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
          } catch {
            // If JSON parsing fails, use status text with added context
            errorMessage = `Verification error: ${response.statusText}`;
          }
          
          console.error(`Verification API error (${response.status}): ${errorMessage}`);
          throw new Error(errorMessage);
        }
      } else if (!response.ok) {
        // Standard error handling for non-verification endpoints
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
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
  registerWithVerification: async (
    email: string, 
    password: string, 
    planType: string,
    verificationCode: string
  ): Promise<{ success: boolean, url?: string, error?: string }> => {
    try {
      // Step 1: Verify the code
      const verifyResponse = await api.fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.error || 'Verification failed' 
        };
      }
      
      // Step 2: Create checkout session
      try {
        const checkoutResponse = await api.fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planName: planType,
            pendingUserEmail: email,
            pendingUserPassword: password,
            successUrl: `${window.location.origin}/dashboard?success=true&email=${encodeURIComponent(email)}`,
            cancelUrl: `${window.location.origin}/pricing?success=false`
          })
        });
        
        if (!checkoutResponse.ok) {
          const errorData = await checkoutResponse.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || 'Failed to create checkout session' 
          };
        }
        
        const { url } = await checkoutResponse.json();
        if (!url) {
          return { 
            success: false, 
            error: 'No redirect URL received from server' 
          };
        }
        
        return { success: true, url };
      } catch (error: any) {
        return { 
          success: false, 
          error: error.message || 'Failed to process payment'
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Registration process failed'
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
    
    const csrfHeaders = await csrfService.getHeaders();
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...csrfHeaders,
          // Let browser set Content-Type with boundary
        },
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }
};

export default api;