const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

class BugBuzzersAPI {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data.user;
  }

  async signup(name, email, password) {
    const data = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(data.token);
    return data.user;
  }

  logout() {
    this.setToken(null);
  }

  // Bug methods
  async getBugs() {
    return await this.request('/bugs');
  }

  async createBug(bugData) {
    return await this.request('/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData),
    });
  }

  async updateBugStatus(bugId, status, points = 0) {
    return await this.request(`/bugs/${bugId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, points }),
    });
  }

  // Leaderboard
  async getLeaderboard() {
    return await this.request('/leaderboard');
  }

  // Health check
  async healthCheck() {
    return await this.request('/health');
  }
}

export default new BugBuzzersAPI();
