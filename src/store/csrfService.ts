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

      // Start a new fetch
      console.log("Initiating CSRF token fetch");
      tokenFetchPromise = new Promise(async (resolve, reject) => {
        try {
          const response = await fetch(`${config.apiUrl}/csrf-token`, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error("CSRF token response error:", response.status, errorText);
            throw new Error(`Failed to fetch CSRF token: ${response.status}`);
          }
          
          const data: CSRFResponse = await response.json();
          
          if (!data || !data.token) {
            console.error("Invalid CSRF token response:", data);
            throw new Error('Received invalid CSRF token');
          }
          
          console.log("CSRF token fetched successfully");
          this._token = data.token;
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