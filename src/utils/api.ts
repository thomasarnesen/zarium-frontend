// src/utils/api.ts
import { config } from '../config';
import csrfService from '../store/csrfService';

const api = {
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    // Maksimalt 1 retry for å unngå kaskadeeffekter
    let retryCount = 0;
    const maxRetries = 1;
    
    const executeRequest = async (): Promise<Response> => {
      try {
        // Enkle headers, uten komplisert CSRF-håndtering som kan feile
        let headers: Record<string, string> = {
          ...(options.headers as Record<string, string> || {}),
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        };
        
        // Bare legg til Content-Type hvis det ikke er FormData
        if (!(options.body instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
        }
        
        // Timeout for å unngå at siden henger
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const fetchOptions: RequestInit = {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal
        };
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // Retry bare for spesifikke feilkoder
        if ([401, 403, 0].includes(response.status) && retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return executeRequest();
        }
        
        return response;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out`);
        }
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 500));
          return executeRequest();
        }
        
        throw error;
      }
    };
    
    return executeRequest();
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
  createRegistrationCheckout: async (
    email: string,
    password: string,
    planType: string,
    priceId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(`${config.apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: priceId,
          planName: planType,
          pendingUserEmail: email,
          pendingUserPassword: password,
          successUrl: `${window.location.origin}/dashboard?success=true&email=${encodeURIComponent(email)}`,
          cancelUrl: `${window.location.origin}/pricing?success=false`
        }),
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId); // Clear timeout

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Error ${response.status}: ${response.statusText}`;
        } catch (e) {
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        console.error("Checkout creation failed:", errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }

      const data = await response.json();
      
      if (!data.url) {
        return {
          success: false,
          error: 'No redirect URL received from server'
        };
      }
      
      return {
        success: true,
        url: data.url
      };
    } catch (error: any) {
      // Special handling for timeout
      if (error.name === 'AbortError') {
        console.error("Checkout request timed out");
        return {
          success: false,
          error: 'Request timed out. Please try again.'
        };
      }
      
      console.error("Checkout creation exception:", error);
      return {
        success: false,
        error: error.message || 'Unknown error creating checkout session'
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
    
    // Get CSRF headers with better error handling
    let csrfHeaders = {};
    try {
      csrfHeaders = await csrfService.getHeaders();
    } catch (csrfError) {
      console.warn('Failed to get CSRF headers for file upload, continuing without them:', csrfError);
    }
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for uploads
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...csrfHeaders,
          // Let browser set Content-Type with boundary
        },
        body: formData,
        credentials: 'include',
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId); // Clear timeout
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      
      return response;
    } catch (error: any) {
      // Special handling for timeout
      if (error.name === 'AbortError') {
        throw new Error('File upload timed out. Please try again with a smaller file or better connection.');
      }
      
      console.error('Upload Error:', error);
      throw error;
    }
  }
};

export default api;