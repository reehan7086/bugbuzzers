/* eslint-disable import/no-anonymous-default-export */
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                     (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

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

    // Log request details for debugging
    console.log('Making API request:', {
      url,
      method: config.method || 'GET',
      hasAuth: !!this.token,
      headers: Object.keys(config.headers)
    });

    try {
      const response = await fetch(url, config);
      
      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });
      
      if (!response.ok) {
        let errorMessage = 'Request failed';
        let errorDetails = null;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Request failed';
          errorDetails = errorData;
          console.error('Server error details:', errorData);
        } catch (jsonError) {
          try {
            const textError = await response.text();
            errorMessage = textError || `HTTP ${response.status}`;
            console.error('Server error (text):', textError);
          } catch (textError) {
            errorMessage = `HTTP ${response.status} - ${response.statusText}`;
            console.error('Could not parse error response');
          }
        }

// Call this in useEffect when component mounts
useEffect(() => {
  checkAPIConnection();
}, []);
        // Create enhanced error object
        const error = new Error(errorMessage);
        error.status = response.status;
        error.statusText = response.statusText;
        error.details = errorDetails;
        error.url = url;
        
        throw error;
      }

      try {
        const data = await response.json();
        console.log('Response data parsed successfully');
        return data;
      } catch (jsonError) {
        console.log('Response is not JSON, returning as text');
        return await response.text();
      }
    } catch (error) {
      console.error('API Error Details:', {
        message: error.message,
        status: error.status,
        url: error.url,
        stack: error.stack
      });
      throw error;
    }
  }

  // ===================== AUTHENTICATION METHODS =====================
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
    return { user: data.user, message: data.message };
  }

  async forgotPassword(email) {
    return await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, password) {
    return await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  logout() {
    this.setToken(null);
  }

  async resendVerification() {
    return await this.request('/auth/resend-verification', {
      method: 'POST',
    });
  }

  async verifyEmail(token) {
    return await this.request(`/auth/verify-email?token=${token}`, {
      method: 'GET',
    });
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // ===================== BUG MANAGEMENT METHODS =====================
async getBugs() {
  try {
    console.log('Fetching bugs from:', `${API_BASE_URL}/api/bugs`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await this.request('/bugs', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('Bugs fetched successfully:', response);
    return response;
  } catch (error) {
    console.error('Failed to fetch bugs:', error.message);
    
    // Provide specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server may be down or unresponsive');
    }
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to server. Please check if the backend is running.');
    }
    
    throw error;
  }
}

  async getBugsWithFallback() {
    try {
      return await this.getBugs();
    } catch (error) {
      console.warn('Using fallback bug data due to server error');
      
      // Return mock data as fallback
      return {
        bugs: [
          {
            id: 'fallback-1',
            title: 'Server Connection Issue',
            description: 'Unable to connect to server. Please try again later.',
            severity: 'high',
            status: 'open',
            app_name: 'BugBuzzers',
            created_at: new Date().toISOString(),
            supports_count: 0,
            is_fallback: true
          }
        ],
        message: 'Showing fallback data due to server issues'
      };
    }
  }

  async createBug(bugData) {
    return await this.request('/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData),
    });
  }

  async createSocialBug(bugData) {
    return await this.request('/bugs/social', {
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

  // ===================== SOCIAL FEED METHODS =====================
  async getSocialFeed(filter = 'trending', category = null, limit = 20, offset = 0) {
    const params = new URLSearchParams({
      filter,
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (category) {
      params.append('category', category);
    }

    return await this.request(`/feed?${params}`);
  }

  async getTrendingBugs(category = null, timeframe = 'today') {
    const params = new URLSearchParams({ timeframe });
    if (category) {
      params.append('category', category);
    }
    
    return await this.request(`/trending?${params}`);
  }

  // ===================== BUG SUPPORT METHODS =====================
  async supportBug(bugId, supportData = {}) {
    return await this.request(`/bugs/${bugId}/support`, {
      method: 'POST',
      body: JSON.stringify({
        supportType: supportData.supportType || 'experienced',
        deviceInfo: supportData.deviceInfo || '',
        additionalContext: supportData.additionalContext || ''
      }),
    });
  }

  async removeBugSupport(bugId) {
    return await this.request(`/bugs/${bugId}/support`, {
      method: 'DELETE',
    });
  }

  async getBugSupporters(bugId, limit = 50, offset = 0) {
    return await this.request(`/bugs/${bugId}/supporters?limit=${limit}&offset=${offset}`);
  }

  // ===================== COMMENT METHODS =====================
  async addComment(bugId, comment, parentId = null) {
    return await this.request(`/bugs/${bugId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, parentId }),
    });
  }

  async getBugComments(bugId, limit = 50, offset = 0) {
    return await this.request(`/bugs/${bugId}/comments?limit=${limit}&offset=${offset}`);
  }

  // ===================== SHARE METHODS =====================
// Fixed shareBug method in api.js
// Replace the existing shareBug method with this corrected version

async shareBug(bugId, platform = 'copy_link') {
  // Ensure we're using a valid platform name that matches backend validation
  const validPlatforms = ['twitter', 'facebook', 'linkedin', 'copy_link', 'internal'];
  const normalizedPlatform = validPlatforms.includes(platform) ? platform : 'copy_link';
  
  console.log('Sharing bug with platform:', normalizedPlatform);
  
  return await this.request(`/bugs/${bugId}/share`, {
    method: 'POST',
    body: JSON.stringify({ platform: normalizedPlatform }),
  });
}

  // ===================== USER SOCIAL METHODS =====================
  async followUser(userId) {
    return await this.request(`/users/${userId}/follow`, {
      method: 'POST',
    });
  }

  async unfollowUser(userId) {
    return await this.request(`/users/${userId}/follow`, {
      method: 'POST', // Same endpoint, will toggle
    });
  }

  async getUserProfile(username) {
    return await this.request(`/users/${username}`);
  }

  // ===================== NOTIFICATION METHODS =====================
  async getNotifications(limit = 20, offset = 0, unreadOnly = false) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      unread_only: unreadOnly.toString()
    });
    
    return await this.request(`/notifications?${params}`);
  }

  async markNotificationsRead(notificationIds = []) {
    return await this.request('/notifications/read', {
      method: 'PUT',
      body: JSON.stringify({ notificationIds }),
    });
  }

  // ===================== LEADERBOARD & HEALTH =====================
  async getLeaderboard() {
    return await this.request('/leaderboard');
  }

  async healthCheck() {
    return await this.request('/health');
  }

  // ===================== UTILITY METHODS =====================

  // Calculate estimated reward based on social engagement
  calculateSocialReward(supportsCount, severity, viralScore = 0) {
    const baseReward = this.getPointsForSeverity(severity);
    const supportMultiplier = Math.min(1 + (supportsCount * 0.1), 10); // Max 10x multiplier
    const viralBonus = viralScore > 1000 ? 2 : viralScore > 500 ? 1.5 : 1;
    
    return Math.round(baseReward * supportMultiplier * viralBonus);
  }

  getPointsForSeverity(severity) {
    const points = { high: 500, medium: 300, low: 150 };
    return points[severity] || 150;
  }

  // Format time ago
  getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  }

  // Check if bug is trending
  isTrendingBug(bug) {
    return bug.is_trending || bug.viral_score > 500 || bug.supports_count > 50;
  }

  // Get user level based on points
  getUserLevel(points) {
    if (points >= 10000) return 'Bug Legend';
    if (points >= 5000) return 'Bug Master';
    if (points >= 1000) return 'Bug Hunter';
    return 'Bug Spotter';
  }

  // Format large numbers
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  // Generate share text for social media
  generateShareText(bug) {
    const supportText = bug.supports_count > 0 ? ` ${bug.supports_count} people also got this bug!` : '';
    const hashtags = bug.hashtags ? ' ' + bug.hashtags.map(tag => `#${tag}`).join(' ') : '';
    
    return `🐛 Found a bug in ${bug.app_name}: "${bug.title}"${supportText} Report bugs and earn rewards on BugBuzzers!${hashtags}`;
  }

  // Get trending categories
  getTrendingCategories() {
    return [
      { id: 1, name: 'Social Media', icon: '📱', gradient: 'from-purple-500 to-pink-500', bugCount: 247 },
      { id: 2, name: 'Finance', icon: '💰', gradient: 'from-green-500 to-emerald-500', bugCount: 189 },
      { id: 3, name: 'Education', icon: '🎓', gradient: 'from-blue-500 to-indigo-500', bugCount: 156 },
      { id: 4, name: 'E-commerce', icon: '🛒', gradient: 'from-orange-500 to-red-500', bugCount: 134 },
      { id: 5, name: 'Entertainment', icon: '🎬', gradient: 'from-red-600 to-pink-600', bugCount: 98 },
      { id: 6, name: 'Transportation', icon: '🚗', gradient: 'from-gray-600 to-gray-800', bugCount: 87 },
      { id: 7, name: 'Healthcare', icon: '🏥', gradient: 'from-teal-500 to-cyan-500', bugCount: 76 },
      { id: 8, name: 'Others', icon: '📋', gradient: 'from-indigo-500 to-purple-600', bugCount: 92 }
    ];
  }

  // Get platform stats (mock data for now)
  getPlatformStats() {
    return {
      totalSupports: 15420,
      activeUsers: 2847,
      trendingBugs: 23,
      totalRewards: 48650,
      bugsReportedToday: 156,
      avgResponseTime: '2.3h',
      topReporter: 'Sarah Johnson',
      mostSupportedBug: 'Instagram crashes when uploading stories'
    };
  }

  // ===================== ERROR RECOVERY METHODS =====================

  // Test connection to API
  async testConnection() {
    try {
      const response = await this.healthCheck();
      console.log('API connection test successful:', response);
      return { success: true, response };
    } catch (error) {
      console.error('API connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get API status with fallback information
  async getAPIStatus() {
    try {
      const health = await this.healthCheck();
      return {
        status: 'healthy',
        server: 'connected',
        timestamp: new Date().toISOString(),
        details: health
      };
    } catch (error) {
      return {
        status: 'error',
        server: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error.message,
        suggestions: [
          'Check if the backend server is running',
          'Verify your internet connection',
          'Check server logs for errors',
          'Try refreshing the page'
        ]
      };
    }
  }

  // Retry wrapper for failed requests
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API request attempt ${attempt}/${maxRetries}`);
        return await requestFn();
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }
}

const apiInstance = new BugBuzzersAPI();
export default apiInstance;
