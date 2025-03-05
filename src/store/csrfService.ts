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
      // Oppdater URL til å bruke /api prefix
      const response = await fetch(`${config.apiUrl}/api/csrf-token`, {
        credentials: 'include',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
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