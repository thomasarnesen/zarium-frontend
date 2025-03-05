import { config } from '../config';

class CSRFService {
  private csrfToken: string | null = null;

  async getHeaders() {
    if (!this.csrfToken) {
      await this.fetchToken();
    }
    return {
      'X-CSRF-Token': this.csrfToken || ''
    };
  }

  async fetchToken() {
    try {
      const response = await fetch(`${config.apiUrl}/csrf-token`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      this.csrfToken = data.token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  async resetToken() {
    this.csrfToken = null;
    await this.fetchToken();
  }
}

export default new CSRFService();