// src/store/csrfService.ts
import { config } from '../config';

interface CSRFResponse {
  token: string;
}

// Tracking variable for token fetching - prevents multiple simultaneous requests
let tokenFetchPromise: Promise<string> | null = null;

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

      // Check if we're in a refresh loop by tracking attempts in sessionStorage
      const now = Date.now();
      const lastAttempt = sessionStorage.getItem('lastCsrfAttempt');
      const attemptCount = parseInt(sessionStorage.getItem('csrfAttemptCount') || '0');
      
      if (lastAttempt && (now - parseInt(lastAttempt)) < 5000 && attemptCount > 3) {
        // If we've tried more than 3 times in 5 seconds, throw immediately
        console.error('Detected CSRF token fetch loop - aborting');
        throw new Error('CSRF token fetch loop detected. Please try again later.');
      }
      
      // Update attempt tracking
      sessionStorage.setItem('lastCsrfAttempt', now.toString());
      sessionStorage.setItem('csrfAttemptCount', (attemptCount + 1).toString());

      // Start a new fetch
      console.log("Initiating CSRF token fetch");
      tokenFetchPromise = new Promise(async (resolve, reject) => {
        try {
          // Try fetching from multiple endpoints if needed
          let response;
          
          // First try the main endpoint
          response = await fetch(`${config.apiUrl}/csrf-token`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store',
            }
          });
          
          // If that fails, try the API endpoint version
          if (!response.ok) {
            console.warn(`First CSRF endpoint failed with status ${response.status}, trying API path`);
            
            response = await fetch(`${config.apiUrl}/api/csrf-token`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store',
              }
            });
          }
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("CSRF token response error:", response.status, errorText);
            
            // Handle 400 errors by clearing session data to allow a fresh start
            if (response.status === 400) {
              // Clear session - likely corrupted
              this.resetToken();
              localStorage.removeItem('authUser');
              localStorage.removeItem('isAuthenticated');
              document.cookie.split(";").forEach(c => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
              });
            }
            
            throw new Error(`Failed to fetch CSRF token: ${response.status}`);
          }
          
          const data: CSRFResponse = await response.json();
          
          if (!data || !data.token) {
            console.error("Invalid CSRF token response:", data);
            throw new Error('Received invalid CSRF token');
          }
          
          console.log("CSRF token fetched successfully");
          this._token = data.token;
          
          // Reset attempt counter on success
          sessionStorage.removeItem('csrfAttemptCount');
          sessionStorage.removeItem('lastCsrfAttempt');
          
          resolve(this._token);
        } catch (error) {
          console.error('Error fetching CSRF token:', error);
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
      // Return empty headers but don't throw
      return {};
    }
  },
  
  resetToken(): void {
    this._token = null;
    console.log("CSRF token reset");
  },
 
  _token: null as string | null,
};

export default csrfService;