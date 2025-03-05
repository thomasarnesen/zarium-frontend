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

    const executeRequest = async (shouldRetry = true): Promise<Response> => {
      try {
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
        
        const csrfHeaders = await csrfService.getHeaders();
        const isFormData = options.body instanceof FormData;
        
        const fetchOptions: RequestInit = {
          ...options,
          headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Accept': 'application/json',
            ...authHeaders,
            ...csrfHeaders,
            ...options.headers,
          },
          credentials: 'include',
          mode: 'cors'
        };

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

        // Re-authenticate on 401/403 errors
        if (response.status === 401 || response.status === 403) {
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
        if (shouldRetry && retryCount < maxRetries) {
          retryCount++;
          console.log(`Network error, retrying (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return executeRequest(true);
        }
        throw error;
      }
    };

    try {
      const startTime = Date.now();
      const response = await executeRequest();
      console.log(`Request to ${endpoint} completed in ${Date.now() - startTime}ms`);

      if (!response.ok) {
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