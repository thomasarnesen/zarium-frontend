// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const url = `${config.apiUrl}${endpoint}`;
    
    try {
      console.log(`Fetching ${url}...`);
      const startTime = Date.now();
      
      // Get CSRF headers
      const csrfHeaders = await csrfService.getHeaders();
      
      // Create default headers
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...csrfHeaders
      };
      
      // Use HTTP-only cookies for auth
      const fetchOptions: RequestInit = {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        credentials: 'include', // Always include credentials for cookies
        mode: 'cors'
      };
      
      const response = await fetch(url, fetchOptions);
      
      console.log(`Request took ${Date.now() - startTime}ms`);
      
      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      
      if (!response.ok) {
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url
        });
        
        let errorMessage = `API error: ${response.statusText}`;
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
    const url = `${config.apiUrl}${endpoint}`;
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