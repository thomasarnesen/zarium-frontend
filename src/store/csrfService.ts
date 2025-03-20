import { config } from '../config';

interface CSRFResponse {
  token: string;
}

// Track token fetching to prevent multiple simultaneous requests
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

      // Track retry attempts without using sessionStorage
      const now = Date.now();
      const lastRetryTime = this._lastRetryTime || 0;
      const retryCount = now - lastRetryTime < 5000 ? this._retryCount + 1 : 1;
      
      this._lastRetryTime = now;
      this._retryCount = retryCount;
      
      if (retryCount > 3) {
        // If we've tried too many times recently, add delay before trying again
        await new Promise(resolve => setTimeout(resolve, (retryCount - 3) * 1000));
      }

      // Start a new fetch
      console.log("Initiating CSRF token fetch");
      tokenFetchPromise = new Promise(async (resolve, reject) => {
        try {
          // Try multiple endpoints sequentially
          let response;
          let attempts = 0;
          const maxAttempts = 2;
          const endpoints = [
            `${config.apiUrl}/csrf-token`,
            `${config.apiUrl}/api/csrf-token`
          ];
          
          for (const endpoint of endpoints) {
            attempts++;
            
            try {
              response = await fetch(endpoint, {
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
                break; // Success!
              }
              
              console.warn(`CSRF endpoint ${endpoint} failed with status ${response.status}`);
              
              // Small delay between endpoint attempts
              if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (error) {
              console.warn(`CSRF fetch network error for ${endpoint}:`, error);
              // Continue to next endpoint
            }
          }
          
          // If all requests failed
          if (!response || !response.ok) {
            const errorText = response ? await response.text().catch(() => "Unknown error") : "No response";
            console.error("All CSRF token endpoints failed:", errorText);
            
            // Handle status 400 (likely corrupted session)
            if (response && response.status === 400) {
              this.resetToken();
            }
            
            throw new Error(`Failed to fetch CSRF token: ${response ? response.status : 'No response'}`);
          }
          
          // Parse the successful response
          const data: CSRFResponse = await response.json().catch(() => ({ token: "" }));
          
          if (!data || !data.token) {
            console.error("Invalid CSRF token response:", data);
            throw new Error('Received invalid CSRF token');
          }
          
          console.log("CSRF token fetched successfully");
          this._token = data.token;
          
          // Reset retry counter on success
          this._retryCount = 0;
          
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
 
  _token: null as string | null,
  _retryCount: 0,
  _lastRetryTime: 0
};

export default csrfService;