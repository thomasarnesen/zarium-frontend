// src/utils/api.ts
import { config } from '../config';
import { useAuthStore } from '../store/authStore'; // Adjust path if needed

const api = {
  apiUrl: config.apiUrl,
  
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    const url = `${config.apiUrl}${apiEndpoint}`;
    
    // Maksimalt 1 retry for å unngå kaskadeeffekter
    let retryCount = 0;
    const maxRetries = 1;
    
    const executeRequest = async (): Promise<Response> => {
      try {
        // Get auth token with enhanced getter (supports Safari fallback)
        const token = useAuthStore.getState().getAuthToken ? 
          useAuthStore.getState().getAuthToken() : 
          api.getAuthToken();
        
        // Prepare headers with auth token if available
        let headers: Record<string, string> = {
          ...(options.headers as Record<string, string> || {}),
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        };
        
        // Add Authorization header if token exists - critical for Safari/iOS
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Only add Content-Type if not FormData
        if (!(options.body instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
        }
        
        // Timeout to prevent page hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000);
        
        const fetchOptions: RequestInit = {
          ...options,
          headers,
          credentials: 'include',
          signal: controller.signal
        };
        
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // Retry only for specific error codes
        if ([401, 403, 0].includes(response.status) && retryCount < maxRetries) {
          // Try to refresh auth
          if (response.status === 401 && useAuthStore.getState().refreshUserData) {
            await useAuthStore.getState().refreshUserData();
          }
          
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
  
  // Helper method for direct access to auth token - crucial for Safari/iOS support
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
    
    // Get token for authorization - Safari/iOS support
    const token = useAuthStore.getState().getAuthToken ? 
      useAuthStore.getState().getAuthToken() : 
      api.getAuthToken();
    
    let headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for uploads
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
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