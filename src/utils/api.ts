// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    try {
      console.log(`Making request to ${url}`);
      
      // Get CSRF headers with retry
      let csrfHeaders = {};
      try {
        csrfHeaders = await csrfService.getHeaders();
      } catch (error) {
        console.warn('CSRF token fetch failed, retrying once...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await csrfService.resetToken();
          csrfHeaders = await csrfService.getHeaders();
        } catch (retryError) {
          console.error('CSRF token fetch failed after retry');
        }
      }

      const defaultHeaders: Record<string, string> = {
        'Accept': 'application/json',
        ...csrfHeaders
      };

      // Only add Content-Type for JSON requests
      if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text();
        throw new Error(errorText || `API error: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Network Error:', error);
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
          ...(csrfHeaders as Record<string, string>),
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