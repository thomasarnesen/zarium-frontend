// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

// Enhanced fetch function with better error handling and token refresh
async function enhancedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Always include credentials to ensure cookies are sent
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include'
  };

  try {
    // Make the API request
    const response = await fetch(`${config.apiUrl}${url}`, fetchOptions);
    
    // If the response is 401 Unauthorized, try to refresh the token once
    if (response.status === 401) {
      console.log("Unauthorized response detected, attempting token refresh");
      
      try {
        // Try to refresh the token
        const refreshResponse = await fetch(`${config.apiUrl}/api/refresh-token`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (refreshResponse.ok) {
          console.log("Token refresh successful, retrying original request");
          // If refresh succeeded, retry the original request
          return fetch(`${config.apiUrl}${url}`, fetchOptions);
        } else {
          console.log("Token refresh failed, redirecting to login");
          // If refresh failed, user needs to log in again
          window.location.href = '/login?session_expired=true';
          return response; // Return the original 401 response
        }
      } catch (refreshError) {
        console.error("Error during token refresh:", refreshError);
        // Handle refresh network errors
        window.location.href = '/login?network_error=true';
        return response; // Return the original response
      }
    }
    
    return response;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Replace the existing fetch implementation with the enhanced one
const api = {
  fetch: enhancedFetch,
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