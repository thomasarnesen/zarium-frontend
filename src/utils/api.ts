// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    const executeRequest = async (shouldRetry = true): Promise<Response> => {
      try {
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

        const response = await fetch(url, fetchOptions);

        // For lange genererings-requests, forny token proaktivt
        if (endpoint.includes('generate-macro')) {
          try {
            await fetch(`${config.apiUrl}/api/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              mode: 'cors'
            });
          } catch (error) {
            console.warn('Failed to refresh token during generation:', error);
          }
        }

        if (response.status === 401 || response.status === 403) {
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Attempt ${retryCount}: Refreshing token...`);
            
            // Vent litt før retry
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
            
            const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
              method: 'POST',
              credentials: 'include',
              mode: 'cors'
            });

            if (refreshResponse.ok) {
              console.log('Token refreshed, retrying request...');
              return executeRequest(true);
            }
          }
          // Kun redirect til login hvis vi har prøvd alle retries
          if (retryCount >= maxRetries && window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }

        return response;
      } catch (error) {
        if (shouldRetry && retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return executeRequest(true);
        }
        throw error;
      }
    };

    return executeRequest();
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