import { config } from '../config';

interface CSRFResponse {
  token: string;
}

const csrfService = {
  async getToken(): Promise<string> {
    try {
      // Return cached token if available
      if (this._token) {
        return this._token;
      }
      
      // Sett timeout for å unngå blokkering
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(`${config.apiUrl}/api/csrf-token`, {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.warn("CSRF token unavailable, continuing without it");
          return "";
        }
        
        const data: CSRFResponse = await response.json();
        this._token = data.token || "";
        return this._token;
      } catch (error) {
        console.warn("CSRF fetch failed, continuing without token:", error);
        return "";
      }
    } catch (error) {
      console.warn("CSRF service error, continuing without token:", error);
      return "";
    }
  },
  
  async getHeaders(): Promise<Record<string, string>> {
    try {
      const token = await this.getToken();
      return token ? { 'X-CSRF-Token': token } : {};
    } catch (error) {
      return {};
    }
  },
  
  resetToken(): void {
    this._token = null;
  },
  
  _token: null as string | null,
};

export default csrfService;