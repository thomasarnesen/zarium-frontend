// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    try {
      console.log(`Fetching ${url}...`);
      const startTime = Date.now();
      
      let retryCount = 0;
      const maxRetries = 3;
      
      const executeRequest = async (): Promise<Response> => {
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
        
        if (response.status === 401 || response.status === 403) {
          if (retryCount < maxRetries) {
            retryCount++;
            // Prøv å fornye token
            try {
              const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors'
              });
              
              if (refreshResponse.ok) {
                // Prøv originalforespørselen på nytt
                return await fetch(url, fetchOptions);
              }
            } catch (error) {
              console.error('Token refresh failed:', error);
            }
          }
          // Hvis vi fortsatt har problemer etter retry, redirect til login
          if (window.location.pathname === '/dashboard') {
            window.location.href = '/login';
          }
        }
        
        return response;
      };

      const response = await executeRequest();
      console.log(`Request took ${Date.now() - startTime}ms`);

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Hvis JSON parsing feiler, bruk status text
        }
        throw new Error(errorMessage);
      }

      return response;
    } catch (error) {
      console.error('Network Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: url
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