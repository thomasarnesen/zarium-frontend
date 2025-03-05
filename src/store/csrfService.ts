import { config } from '../config';

class CSRFService {
  private csrfToken: string | null = null;

  async getHeaders() {
    if (!this.csrfToken) {
      await this.fetchToken();
    }
    return this.csrfToken ? { 'X-CSRF-Token': this.csrfToken } : {};
  }

  async fetchToken() {
    try {
      console.log('Fetching CSRF token...');
      const response = await fetch(`${config.apiUrl}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('CSRF token fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      this.csrfToken = data.token;
      console.log('CSRF token fetched successfully');
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }

  async resetToken() {
    console.log('Resetting CSRF token...');
    this.csrfToken = null;
    await this.fetchToken();
  }
}

export default new CSRFService();