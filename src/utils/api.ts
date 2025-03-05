// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    let retryCount = 0;
    try {
      console.log(`Fetching ${url}...`);
      const startTime = Date.now();
      
      const maxRetries = 3;
      
      const executeRequest = async (shouldRetry = true): Promise<Response> => {
        if (retryCount >= maxRetries) {
          throw new Error(`Maximum retries (${maxRetries}) exceeded`);
        }

        const csrfHeaders = await csrfService.getHeaders();
        const isFormData = options.body instanceof FormData;
        
        const fetchOptions: RequestInit = {
          ...options,
          headers: {
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            'Accept': 'application/json',
            ...csrfHeaders,
            ...options.headers,
          },
          credentials: 'include',
          mode: 'cors'
        };

        try {
          const response = await fetch(url, fetchOptions);
          
          if (response.status === 401 || response.status === 403) {
            if (shouldRetry) {
              console.log(`Attempt ${retryCount + 1}: Token expired, attempting refresh...`);
              const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors'
              });
              
              if (refreshResponse.ok) {
                console.log('Token refreshed successfully, retrying original request');
                retryCount++;
                return executeRequest(true);
              } else {
                console.log('Token refresh failed');
                if (window.location.pathname === '/dashboard') {
                  window.location.href = '/login';
                }
                throw new Error('Session expired');
              }
            } else {
              throw new Error('Authentication failed after token refresh');
            }
          }
          
          return response;
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === 'Session expired') {
              throw error;
            }
            if (shouldRetry && retryCount < maxRetries) {
              console.log(`Request failed, attempt ${retryCount + 1} of ${maxRetries}`);
              retryCount++;
              // Eksponensiell backoff: 1s, 2s, 4s...
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
              return executeRequest(true);
            }
          }
          throw error;
        }
      };

      const response = await executeRequest();
      console.log(`Request completed in ${Date.now() - startTime}ms after ${retryCount} retries`);

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
      console.error('Network Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: url,
        retries: retryCount
      });
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