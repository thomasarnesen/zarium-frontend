// src/utils/api.ts
import { config } from '../config';
import { useAuthStore } from '../store/authStore'; // Adjust path if needed

const api = {
  apiUrl: config.apiUrl,
  
  fetch: async (endpoint: string, options: RequestInit = {}) => {
    const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    let url = `${config.apiUrl}${apiEndpoint}`;
    
    // Maksimalt 1 retry for å unngå kaskadeeffekter
    let retryCount = 0;
    const maxRetries = 1;
    
    const executeRequest = async (): Promise<Response> => {
      try {
        // Get auth token with enhanced getter
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
        
        // Safari/iPhone workaround for token refresh
        // If the path is refresh-token and it's a POST, make sure we can handle GET conversion
        if (url.includes('/api/refresh-token') && options.method === 'POST') {
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                          /iphone|ipad|ipod/i.test(navigator.userAgent);
                          
          if (isSafari) {
            console.log("Using Safari/iOS token refresh workaround");
            // For Safari, add token as a query parameter as well
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}token=${encodeURIComponent(token || '')}`;
          }
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
        if ([401, 403, 405, 0].includes(response.status) && retryCount < maxRetries) {
          // Log for debugging
          console.warn(`Request failed with status ${response.status}, retrying...`);
          
          // Add delay before retry
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
  createRegistrationCheckout: async (
    email: string,
    password: string,
    planType: string,
    priceId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
      console.log(`Creating checkout for plan: ${planType}, priceId: ${priceId}`);
      
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      // Get auth token if user is logged in
      const token = api.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      };
      
      // Add auth token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log("Added auth token to checkout request");
      }
      
      const requestData = {
        priceId: priceId,
        planName: planType,
        pendingUserEmail: email,
        pendingUserPassword: password,
        successUrl: `${window.location.origin}/dashboard?success=true&email=${encodeURIComponent(email)}`,
        cancelUrl: `${window.location.origin}/pricing?success=false`
      };
      
      console.log("Checkout request data:", JSON.stringify(requestData));
      
      const response = await fetch(`${config.apiUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: headers,
        credentials: 'include',
        body: JSON.stringify(requestData),
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId); // Clear timeout
      console.log("Checkout response status:", response.status);
  
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
      console.log("Checkout response data received");
      
      if (!data.url) {
        return {
          success: false,
          error: 'No redirect URL received from server'
        };
      }
      
      console.log("Redirecting to Stripe URL:", data.url.substring(0, 50) + "...");
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
  
  // Special method for handling registration flow
  
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
  },
  
  // Add this method to your api object
  refreshTokenSafari: async () => {
    try {
      const token = api.getAuthToken();
      if (!token) {
        console.error("No token available for refresh");
        return null;
      }
      
      // For iOS Safari, use GET method with token in URL
      const url = `${config.apiUrl}/api/refresh-token?token=${encodeURIComponent(token)}`;
      
      const response = await fetch(url, {
        method: 'GET',  // Explicitly use GET for Safari
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error("Safari token refresh failed:", response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Update localStorage with new token
      if (data.token) {
        const authUser = JSON.parse(localStorage.getItem('authUser') || '{}');
        authUser.token = data.token;
        localStorage.setItem('authUser', JSON.stringify(authUser));
        console.log("Token refreshed via Safari workaround");
        return data;
      }
      
      return null;
    } catch (error) {
      console.error("Safari token refresh error:", error);
      return null;
    }
  }
};

export default api;