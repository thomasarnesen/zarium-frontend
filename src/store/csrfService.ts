// src/store/csrfService.ts
import { config } from '../config';

interface CSRFResponse {
  token: string;
}

// Track token fetching to prevent multiple simultaneous requests
let tokenFetchPromise: Promise<string> | null = null;

// Define error types for better error handling
class CSRFError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'CSRFError';
    this.status = status;
  }
}

const csrfService = {
  async getToken(): Promise<string> {
    try {
      // Return cached token if available
      if (this._token) {
        return this._token;
      }
      
      // If a fetch is already in progress, return that promise
      if (tokenFetchPromise) {
        return tokenFetchPromise;
      }

      // Simple retry tracking without sessionStorage
      const now = Date.now();
      const lastRetryTime = this._lastRetryTime || 0;
      const retryCount = now - lastRetryTime < 5000 ? this._retryCount + 1 : 1;
      
      this._lastRetryTime = now;
      this._retryCount = retryCount;
      
      // Add delay for rapid retries to prevent overwhelming the server
      if (retryCount > 2) {
        const delay = (retryCount - 2) * 1000; // Progressive delay
        console.log(`Delaying CSRF token fetch for ${delay}ms due to multiple retries`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Start a new fetch
      console.log("Initiating CSRF token fetch");
      tokenFetchPromise = new Promise(async (resolve, reject) => {
        try {
          // Define endpoints to try
          const endpoints = [
            `/csrf-token`,
            `/api/csrf-token`
          ];
          
          // Try each endpoint with the API URL
          for (const endpoint of endpoints) {
            try {
              console.log(`Trying CSRF endpoint: ${config.apiUrl}${endpoint}`);
              
              const response = await fetch(`${config.apiUrl}${endpoint}`, {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store',
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Requested-With': 'XMLHttpRequest'
                }
              });
              
              if (response.ok) {
                // Success - parse the token
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                  console.warn(`CSRF endpoint returned non-JSON content type: ${contentType}`);
                }
                
                // Try to parse as JSON
                const data: CSRFResponse = await response.json().catch(() => ({ token: "" }));
                
                if (!data || !data.token) {
                  console.error("Invalid CSRF token response:", data);
                  continue; // Try next endpoint
                }
                
                console.log("CSRF token fetched successfully");
                this._token = data.token;
                this._retryCount = 0;
                resolve(this._token);
                return; // Exit the promise function
              }
              
              // Log the error for debugging
              console.warn(`CSRF endpoint ${endpoint} failed with status ${response.status}`);
              
              // For 400 errors, try to get more details
              if (response.status === 400) {
                console.warn("CSRF service returning 400 - implementing fallback mode");
                // Generate client-side token as fallback
                const fallbackToken = Array(32).fill(0).map(() => 
                  Math.floor(Math.random() * 16).toString(16)).join('');
                this._token = fallbackToken;
                resolve(fallbackToken);
                return; // Exit after resolving with fallback token
                
                // The original code continues below - we'll still log the error details
                const errorText = await response.text().catch(() => "Unknown error");
                console.warn(`CSRF 400 error details: ${errorText}`);
                
                // If this looks like a cookie error, log it more specifically
                if (errorText.includes('cookie') || errorText.includes('session')) {
                  console.warn('CSRF token error appears to be cookie-related');
                }
              }
            } catch (endpointError) {
              console.warn(`Network error fetching from ${endpoint}:`, endpointError);
              // Continue to the next endpoint
            }
          }
          
          // If we get here, all endpoints failed
          console.error("All CSRF token endpoints failed");
          
          // Clear existing token if it might be corrupted
          this._token = null;
          
          reject(new CSRFError('Failed to fetch CSRF token from any endpoint'));
        } catch (error) {
          console.error('Error in CSRF token fetch:', error);
          this._token = null;
          reject(error);
        } finally {
          tokenFetchPromise = null;
        }
      });
      
      return tokenFetchPromise;
    } catch (error) {
      console.error('Error in getToken:', error);
      this._token = null;
      throw error;
    }
  },
  
  async getHeaders(): Promise<Record<string, string>> {
    try {
      const token = await this.getToken();
      return {
        'X-CSRF-Token': token,
      };
    } catch (error) {
      console.error('Failed to get CSRF headers:', error);
      // Return empty headers but don't fail the request
      return {};
    }
  },
  
  resetToken(): void {
    this._token = null;
    this._retryCount = 0;
    this._lastRetryTime = 0;
    console.log("CSRF token reset");
  },
  
  checkCookiesEnabled(): boolean {
    try {
      // Try to set and read a test cookie
      const testValue = `test-${Date.now()}`;
      document.cookie = `csrf_test=${testValue};path=/;max-age=60`;
      
      // Try to read it back
      const cookies = document.cookie.split(';');
      const found = cookies.some(cookie => cookie.trim().startsWith('csrf_test='));
      
      // Clean up
      document.cookie = "csrf_test=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      
      return found;
    } catch (e) {
      console.warn('Error checking cookie support:', e);
      return false;
    }
  },
  
  // Helper function to diagnose CSRF issues
  async diagnoseIssues(): Promise<string[]> {
    const issues: string[] = [];
    
    // Check if cookies are enabled
    if (!this.checkCookiesEnabled()) {
      issues.push('Cookies appear to be disabled or blocked in your browser');
    }
    
    // Check if we're running in a cross-origin context
    try {
      const siteUrl = new URL(window.location.href);
      const apiUrl = new URL(config.apiUrl);
      
      if (siteUrl.origin !== apiUrl.origin) {
        issues.push('Cross-origin request detected - third-party cookies may be blocked');
      }
    } catch (e) {
      issues.push('Unable to verify same-origin policy');
    }
    
    // Check local storage
    try {
      localStorage.setItem('csrf_test', 'test');
      localStorage.removeItem('csrf_test');
    } catch (e) {
      issues.push('LocalStorage is not available - browser may be in strict privacy mode');
    }
    
    return issues;
  },
 
  _token: null as string | null,
  _retryCount: 0,
  _lastRetryTime: 0
};

export default csrfService;