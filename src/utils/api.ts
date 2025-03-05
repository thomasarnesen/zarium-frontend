// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    try {
      const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      const url = `${config.apiUrl}${apiEndpoint}`;
      
      // Retry CSRF token fetch if it fails
      let csrfHeaders = {};
      try {
        csrfHeaders = await csrfService.getHeaders();
      } catch (error) {
        console.warn('Failed to get CSRF token on first try, retrying...');
        try {
          await csrfService.resetToken();
          csrfHeaders = await csrfService.getHeaders();
        } catch (retryError) {
          console.error('Failed to get CSRF token after retry:', retryError);
        }
      }
      
      const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...csrfHeaders
      };

      // Don't include Content-Type for FormData
      if (options.body instanceof FormData) {
        delete defaultHeaders['Content-Type'];
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

      // Handle auth errors
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        let errorMessage = `API error: ${response.statusText}`;
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
      console.error('API Error:', error);
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