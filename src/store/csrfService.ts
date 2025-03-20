import { config } from '../config';

interface CSRFResponse {
  token: string;
}

// Track token fetching to prevent multiple simultaneous requests
let tokenFetchPromise: Promise<string> | null = null;

const csrfService = {
  /**
   * Get a CSRF token - will never fail as it has multiple fallback mechanisms
   */
  async getToken(): Promise<string> {
    try {
      // Return cached token if available
      if (this._token) {
        console.log("Using cached CSRF token");
        return this._token;
      }
      
      // If a fetch is already in progress, return that promise
      if (tokenFetchPromise) {
        console.log("Using in-progress CSRF token fetch");
        try {
          return await tokenFetchPromise;
        } catch (error) {
          console.warn("In-progress token fetch failed, using fallback");
          // Continue to fallback
        }
      }

      console.log("Starting new CSRF token fetch");
      
      // Try to get a token from the server with timeout
      try {
        const token = await this.fetchTokenWithTimeout(5000); // 5s timeout
        if (token) {
          this._token = token;
          console.log("Successfully fetched CSRF token from server");
          return token;
        }
      } catch (error) {
        console.warn("Server token fetch failed:", error);
        // Continue to fallback mechanism
      }
      
      // Fallback: Generate a client-side token
      console.log("Using client-generated fallback CSRF token");
      const fallbackToken = this.generateFallbackToken();
      this._token = fallbackToken;
      return fallbackToken;
    } catch (error) {
      // Ultimate fallback - even if everything else fails
      console.error("All CSRF token mechanisms failed, using emergency fallback");
      const emergencyToken = this.generateFallbackToken();
      this._token = emergencyToken;
      return emergencyToken;
    }
  },
  
  /**
   * Fetch a token from the server with a timeout
   */
  fetchTokenWithTimeout(timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create a timeout that will reject the promise
      const timeoutId = setTimeout(() => {
        tokenFetchPromise = null;
        reject(new Error(`CSRF token fetch timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      // Start the actual fetch
      tokenFetchPromise = this.fetchServerToken();
      
      // Handle the fetch result
      tokenFetchPromise
        .then(token => {
          clearTimeout(timeoutId);
          tokenFetchPromise = null;
          resolve(token);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          tokenFetchPromise = null;
          reject(error);
        });
    });
  },
  
  /**
   * Attempt to fetch a token from multiple server endpoints
   */
  async fetchServerToken(): Promise<string> {
    const endpoints = [
      `${config.apiUrl}/csrf-token`,
      `${config.apiUrl}/api/csrf-token`,
      // Add more fallback endpoints if needed
    ];
    
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying CSRF endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store', // Prevent caching
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          // Try to parse as JSON
          const data: CSRFResponse = await response.json().catch(() => ({ token: "" }));
          
          if (data && data.token) {
            return data.token;
          }
          
          console.warn(`Endpoint ${endpoint} returned invalid token data:`, data);
          continue; // Try next endpoint
        }
        
        console.warn(`CSRF endpoint ${endpoint} failed with status ${response.status}`);
        
      } catch (error) {
        console.warn(`Network error fetching from ${endpoint}:`, error);
        lastError = error;
        // Continue to next endpoint
      }
    }
    
    throw lastError || new Error("All CSRF endpoints failed");
  },
  
  /**
   * Generate a random token client-side as a fallback
   */
  generateFallbackToken(): string {
    // Generate a random hex string of 32 bytes (64 chars)
    return Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)).join('');
  },
  
  /**
   * Get headers containing the CSRF token
   */
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
  
  /**
   * Reset the cached token
   */
  resetToken(): void {
    this._token = null;
    console.log("CSRF token reset");
  },
  
  /**
   * Check if cookies are enabled in the browser
   */
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
  
  /**
   * Diagnose CSRF-related issues
   */
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
 
  _token: null as string | null
};

export default csrfService;