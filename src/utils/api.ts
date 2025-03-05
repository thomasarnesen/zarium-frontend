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
      
      // Get CSRF headers
      const csrfHeaders = await csrfService.getHeaders();
      
      // Don't set Content-Type for FormData
      const isFormData = options.body instanceof FormData;
      const defaultHeaders = isFormData ? {
        ...csrfHeaders
      } : {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...csrfHeaders
      };
      
      const fetchOptions: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        credentials: 'include',
        mode: 'cors'
      };
      
      const response = await fetch(url, fetchOptions);
      console.log(`Request took ${Date.now() - startTime}ms`);
      
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