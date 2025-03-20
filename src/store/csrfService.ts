import { config } from '../config';

interface CSRFResponse {
  token: string;
}

const csrfService = {
  async getToken(): Promise<string> {
    try {
      // Hvis vi allerede har et token, returner det
      if (this._token) {
        return this._token;
      }

      console.log("Henter nytt CSRF token...");
      
      const response = await fetch(`${config.apiUrl}/csrf-token`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("CSRF token response not OK:", response.status, errorText);
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data: CSRFResponse = await response.json();
      
      if (!data.token) {
        console.error("Received invalid CSRF token:", data);
        throw new Error('Received invalid CSRF token');
      }
      
      console.log("CSRF token hentet vellykket");
      this._token = data.token;
      return this._token;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
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
      console.error('Could not get CSRF headers:', error);
      return {}; // Returner tomme headers, men ikke kast feil
    }
  },
  
  resetToken(): void {
    this._token = null;
    console.log("CSRF token reset");
  },
 
  _token: null as string | null,
};

export default csrfService;