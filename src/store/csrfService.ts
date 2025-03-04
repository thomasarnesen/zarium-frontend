
import { config } from '../config';

interface CSRFResponse {
  token: string;
}

const csrfService = {
  async getToken(): Promise<string> {
    try {
      
      if (this._token) {
        return this._token;
      }

      const response = await fetch(`${config.apiUrl}/csrf-token`, {
        method: 'GET',
        credentials: 'include', 
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data: CSRFResponse = await response.json();
      this._token = data.token;
      return this._token;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      return '';
    }
  },

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'X-CSRF-Token': token,
    };
  },

  resetToken(): void {
    this._token = null;
  },

  
  _token: null as string | null,
};

export default csrfService;