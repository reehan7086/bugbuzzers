/* eslint-disable import/no-anonymous-default-export */
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
        let errorMessage = 'Request failed';
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || 'Request failed';
        } catch (jsonError) {
          try {
            errorMessage = await response.text() || `HTTP ${response.status}`;
          } catch (textError) {
            errorMessage = `HTTP ${response.status} - ${response.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      try {
        return await response.json();
      } catch (jsonError) {
        return await response.text();
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ===================== EXISTING AUTH METHODS =====================
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

  // ===================== ENHANCED BUG METHODS WITH SOCIAL FEATURES =====================
  async getBugs() {
    return await this.request('/bugs');
  }

  async createBug(bugData) {
    return await this.request('/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData),
    });
  }

  // NEW: Create social bug with enhanced features
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

  // ===================== NEW SOCIAL API METHODS =====================

  // Social Feed Methods
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

  // Bug Support Methods (Main Social Feature!)
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

  // Comment Methods
  async addComment(bugId, comment, parentId = null) {
    return await this.request(`/bugs/${bugId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ comment, parentId }),
    });
  }

  async getBugComments(bugId, limit = 50, offset = 0) {
    return await this.request(`/bugs/${bugId}/comments?limit=${limit}&offset=${offset}`);
  }

  // Share Methods
  async shareBug(bugId, platform = 'copy_link') {
    return await this.request(`/bugs/${bugId}/share`, {
      method: 'POST',
      body: JSON.stringify({ platform }),
    });
  }

  // User Social Methods
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

  // Notification Methods
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

  // ===================== EXISTING METHODS =====================
  async getLeaderboard() {
    return await this.request('/leaderboard');
  }

  async healthCheck() {
    return await this.request('/health');
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

async addComment(bugId, comment, parentId = null) {
  return await this.request(`/bugs/${bugId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment, parentId }),
  });
}

async getBugComments(bugId, limit = 50, offset = 0) {
  return await this.request(`/bugs/${bugId}/comments?limit=${limit}&offset=${offset}`);
}

async shareBug(bugId, platform = 'copy_link') {
  return await this.request(`/bugs/${bugId}/share`, {
    method: 'POST',
    body: JSON.stringify({ platform }),
  });
}  }

  // ===================== UTILITY METHODS FOR SOCIAL FEATURES =====================

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
}

export default new BugBuzzersAPI();
