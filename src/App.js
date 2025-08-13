import React, { useState, useEffect } from 'react';
import { Bug, Trophy, Shield, Upload, Eye, EyeOff, Star, Clock, CheckCircle, XCircle, AlertCircle, User, LogOut, Menu, X } from 'lucide-react';
import api from './api';

const BugBuzzers = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Forms state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [bugForm, setBugForm] = useState({
    title: '', description: '', steps: '', device: '', severity: 'medium', 
    appName: '', anonymous: false, attachment: null
  });

  // Data state
  const [bugs, setBugs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // TODO: Verify token and get user info
      setCurrentView('dashboard');
    }
    
    // Health check
    api.healthCheck().then(() => {
      console.log('API connection successful');
    }).catch(err => {
      console.error('API connection failed:', err);
      setError('Unable to connect to server');
    });
  }, []);

  const getEstimatedReviewTime = (severity) => {
    const times = { high: 6, medium: 4, low: 2 };
    return times[severity] || 2;
  };

  const getPointsForSeverity = (severity) => {
    const points = { high: 500, medium: 300, low: 150 };
    return points[severity] || 150;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'In Review': 'bg-yellow-100 text-yellow-800',
      'Verified': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Fixed': 'bg-purple-100 text-purple-800',
      'Rewarded': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!loginForm.email || !loginForm.password) {
      setError('Please enter both email and password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const userData = await api.login(loginForm.email, loginForm.password);
      setUser(userData);
      setCurrentView(userData.isAdmin ? 'admin' : 'dashboard');
      setLoginForm({ email: '', password: '' });
      
      // Load initial data
      if (userData.isAdmin) {
        loadBugs();
      } else {
        loadUserBugs();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const userData = await api.signup(signupForm.name, signupForm.email, signupForm.password);
      setUser(userData);
      setCurrentView('dashboard');
      setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
      loadUserBugs();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const newBug = await api.createBug({
        title: bugForm.title,
        description: bugForm.description,
        steps: bugForm.steps,
        device: bugForm.device,
        severity: bugForm.severity,
        appName: bugForm.appName,
        anonymous: bugForm.anonymous
      });
      
      setBugForm({
        title: '', description: '', steps: '', device: '', severity: 'medium', 
        appName: '', anonymous: false, attachment: null
      });
      
      alert(`Bug submitted successfully! Your bug ID is ${newBug.id}`);
      loadUserBugs(); // Refresh bugs list
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 100 * 1024 * 1024) {
      setError('File size must be under 100MB');
      return;
    }
    setBugForm({ ...bugForm, attachment: file });
  };

  const updateBugStatus = async (bugId, newStatus, assignedPoints = 0) => {
    setLoading(true);
    try {
      await api.updateBugStatus(bugId, newStatus, assignedPoints);
      loadBugs(); // Refresh bugs list
      
      // Update user points if verified
      if (newStatus === 'Verified' && assignedPoints > 0) {
        const updatedUser = { ...user, points: user.points + (user.isAdmin ? 0 : assignedPoints) };
        setUser(updatedUser);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBugs = async () => {
    try {
      const bugsData = await api.getBugs();
      setBugs(bugsData);
    } catch (error) {
      setError('Failed to load bugs');
    }
  };

  const loadUserBugs = async () => {
    try {
      const bugsData = await api.getBugs();
      setBugs(bugsData.filter(bug => bug.user_id === user?.id));
    } catch (error) {
      setError('Failed to load your bugs');
    }
  };

  const loadLeaderboard = async () => {
    try {
      const leaderboardData = await api.getLeaderboard();
      setLeaderboard(leaderboardData);
    } catch (error) {
      setError('Failed to load leaderboard');
    }
  };

  const getUserBugs = () => {
    return bugs.filter(bug => bug.user_id === user?.id);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setBugs([]);
    setLeaderboard([]);
    setCurrentView('landing');
    setMobileMenuOpen(false);
  };

  // Quick login functions for demo
  const quickLogin = async (email, password, isAdmin = false) => {
    setLoading(true);
    try {
      const userData = await api.login(email, password);
      setUser(userData);
      setCurrentView(isAdmin ? 'admin' : 'dashboard');
      
      if (isAdmin) {
        loadBugs();
      } else {
        loadUserBugs();
      }
    } catch (error) {
      setError('Demo login failed. Using fallback...');
      // Fallback for demo
      const demoUser = {
        id: isAdmin ? 2 : 1,
        name: isAdmin ? 'Admin User' : 'John Doe',
        email: email,
        points: isAdmin ? 0 : 1250,
        isAdmin: isAdmin
      };
      setUser(demoUser);
      setCurrentView(isAdmin ? 'admin' : 'dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Error display component
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
        <button onClick={() => setError('')} className="ml-2 text-red-900 hover:text-red-700">×</button>
      </div>
    );
  };

  // Loading component
  const LoadingSpinner = () => {
    if (!loading) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500">
        <LoadingSpinner />
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <header className="p-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-white" />
                <span className="text-2xl font-bold text-white">BugBuzzers</span>
              </div>
              <div className="hidden md:flex gap-4">
                <button 
                  onClick={() => setCurrentView('login')}
                  className="px-6 py-2 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => setCurrentView('signup')}
                  className="px-6 py-2 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Sign Up
                </button>
              </div>
              <button 
                className="md:hidden text-white"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            
            {mobileMenuOpen && (
              <div className="md:hidden mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <button 
                  onClick={() => { setCurrentView('login'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-white hover:text-purple-200"
                >
                  Login
                </button>
                <button 
                  onClick={() => { setCurrentView('signup'); setMobileMenuOpen(false); }}
                  className="block w-full text-left py-2 text-white hover:text-purple-200"
                >
                  Sign Up
                </button>
              </div>
            )}
          </header>

          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="text-center mb-16">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Turn Bug Reports Into
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"> Rewards</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
                Help make the digital world better while earning rewards. Report bugs, get verified, and earn points that convert to real money.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => setCurrentView('signup')}
                  className="px-8 py-4 bg-white text-purple-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Earning Rewards
                </button>
                <button 
                  onClick={() => setCurrentView('login')}
                  className="px-8 py-4 border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-purple-600 transition-all"
                >
                  I Have An Account
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                <Bug className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Report Bugs</h3>
                <p className="text-white/80">Found a bug? Report it with screenshots or videos and detailed steps.</p>
              </div>
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Get Verified</h3>
                <p className="text-white/80">Our team verifies your reports within hours based on severity level.</p>
              </div>
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl">
                <Trophy className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Earn Rewards</h3>
                <p className="text-white/80">Get points for verified bugs: High=500pts, Medium=300pts, Low=150pts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login Page
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Bug className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to start reporting bugs and earning rewards</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-sm p-8">
            <ErrorMessage />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('john@example.com', 'password123', false)}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                Quick Login as User (John)
              </button>
              <button
                type="button"
                onClick={() => quickLogin('admin@bugbuzzers.com', 'admin123', true)}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                Quick Login as Admin
              </button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('signup')}
                  className="text-purple-600 font-medium hover:text-purple-700"
                >
                  Sign up now
                </button>
              </p>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2"><strong>Demo Credentials:</strong></p>
              <p className="text-xs text-gray-500">User: john@example.com / password123</p>
              <p className="text-xs text-gray-500">Admin: admin@bugbuzzers.com / admin123</p>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('landing')}
              className="text-purple-600 hover:text-purple-700"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Continue with other views (signup, dashboard, etc.) - keeping them similar but with API integration
// Signup Page
  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Bug className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Join BugBuzzers</h2>
            <p className="text-gray-600 mt-2">Create your account and start earning rewards for reporting bugs</p>
          </div>

          <form onSubmit={handleSignup} className="bg-white rounded-lg shadow-sm p-8">
            <ErrorMessage />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={signupForm.password}
                onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <input
                type="password"
                value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('login')}
                  className="text-purple-600 font-medium hover:text-purple-700"
                >
                  Sign in
                </button>
              </p>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setCurrentView('landing')}
              className="text-purple-600 hover:text-purple-700"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User Dashboard
  if (currentView === 'dashboard' && user && !user.isAdmin) {
    const userBugs = getUserBugs();
    
    // Load user bugs if not loaded
    useEffect(() => {
      if (bugs.length === 0) {
        loadUserBugs();
      }
    }, []);

    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">{user.points} pts</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-6">
          <ErrorMessage />
          
          <div className="mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('report-bug')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Report Bug
              </button>
              <button
                onClick={() => {
                  setCurrentView('leaderboard');
                  loadLeaderboard();
                }}
                className="px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
              >
                Leaderboard
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bug className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userBugs.length}</p>
                  <p className="text-sm text-gray-600">Total Reports</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userBugs.filter(b => b.status === 'Verified').length}</p>
                  <p className="text-sm text-gray-600">Verified</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userBugs.filter(b => b.status === 'In Review').length}</p>
                  <p className="text-sm text-gray-600">Under Review</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Trophy className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{user.points}</p>
                  <p className="text-sm text-gray-600">Total Points</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Bug Reports</h2>
            {userBugs.length === 0 ? (
              <div className="text-center py-8">
                <Bug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No bug reports yet</p>
                <button
                  onClick={() => setCurrentView('report-bug')}
                  className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Report Your First Bug
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userBugs.map((bug) => (
                  <div key={bug.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{bug.title}</h3>
                        <p className="text-sm text-gray-600">ID: {bug.id} • {bug.app_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                          {bug.status}
                        </span>
                        {bug.points > 0 && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            +{bug.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div><strong>Severity:</strong> {bug.severity}</div>
                      <div><strong>Device:</strong> {bug.device}</div>
                      <div><strong>Submitted:</strong> {new Date(bug.submitted_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Bug Reporting Form
  if (currentView === 'report-bug' && user && !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Report a Bug</h1>
              <p className="text-gray-600">Help us improve the digital world and earn rewards</p>
            </div>

            <ErrorMessage />

            <form onSubmit={handleBugSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bug Title *</label>
                <input
                  type="text"
                  value={bugForm.title}
                  onChange={(e) => setBugForm({...bugForm, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Brief description of the bug"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App/Website Name *</label>
                <input
                  type="text"
                  value={bugForm.appName}
                  onChange={(e) => setBugForm({...bugForm, appName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Name of the app or website where you found the bug"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level *</label>
                  <select
                    value={bugForm.severity}
                    onChange={(e) => setBugForm({...bugForm, severity: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                    disabled={loading}
                  >
                    <option value="high">High (500 pts)</option>
                    <option value="medium">Medium (300 pts)</option>
                    <option value="low">Low (150 pts)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Review Time</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    {bugForm.severity === 'high' && '6 hours'}
                    {bugForm.severity === 'medium' && '4 hours'}
                    {bugForm.severity === 'low' && '2 hours'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Device/Browser Information *</label>
                <input
                  type="text"
                  value={bugForm.device}
                  onChange={(e) => setBugForm({...bugForm, device: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Chrome 120, iOS 17, Windows 11"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bug Description *</label>
                <textarea
                  value={bugForm.description}
                  onChange={(e) => setBugForm({...bugForm, description: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-32"
                  placeholder="Detailed description of what went wrong"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Steps to Reproduce *</label>
                <textarea
                  value={bugForm.steps}
                  onChange={(e) => setBugForm({...bugForm, steps: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-32"
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. Expected vs Actual result..."
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Image/Video)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload screenshot or screen recording</p>
                  <p className="text-xs text-gray-500 mb-4">Max file size: 100MB</p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,video/*"
                    className="w-full"
                    disabled={loading}
                  />
                  {bugForm.attachment && (
                    <p className="mt-2 text-sm text-green-600">
                      File selected: {bugForm.attachment.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={bugForm.anonymous}
                  onChange={(e) => setBugForm({...bugForm, anonymous: e.target.checked})}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  disabled={loading}
                />
                <label htmlFor="anonymous" className="text-sm text-gray-700">
                  Report anonymously (your identity will be hidden but we'll track it internally)
                </label>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">Reward Information</h3>
                <div className="text-sm text-purple-700 space-y-1">
                  <p>• High severity bugs: <strong>500 points</strong></p>
                  <p>• Medium severity bugs: <strong>300 points</strong></p>
                  <p>• Low severity bugs: <strong>150 points</strong></p>
                  <p className="text-xs mt-2 text-purple-600">Points will be awarded after verification. Duplicate reports won't receive points.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors text-lg disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Bug Report'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard
  if (currentView === 'leaderboard' && user && !user.isAdmin) {
    const userRank = leaderboard.findIndex(u => u.id === user.id) + 1;
    
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto p-6">
          <ErrorMessage />
          
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
            <p className="text-gray-600">Top bug hunters and their rewards</p>
            {userRank > 0 && (
              <p className="text-purple-600 font-medium mt-2">Your rank: #{userRank}</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Top Bug Reporters</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {leaderboard.map((userData, index) => (
                <div key={userData.id} className={`px-6 py-4 flex items-center justify-between ${userData.id === user.id ? 'bg-purple-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {index === 0 && <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">1</div>}
                      {index === 1 && <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">2</div>}
                      {index === 2 && <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold">3</div>}
                      {index > 2 && <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold">{index + 1}</div>}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{userData.name}</p>
                      <p className="text-sm text-gray-500">{userData.bugs_reported} bugs reported</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-purple-600">{userData.points} pts</span>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="px-6 py-8 text-center text-gray-500">
                  No rankings yet. Be the first to report a bug and earn points!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Panel
  if (currentView === 'admin' && user?.isAdmin) {
    const pendingBugs = bugs.filter(bug => bug.status === 'Submitted' || bug.status === 'In Review');
    
    // Load bugs if not loaded
    useEffect(() => {
      if (bugs.length === 0) {
        loadBugs();
      }
    }, []);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-600" />
                <span className="text-2xl font-bold text-gray-900">Admin Panel</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto p-6">
          <ErrorMessage />
          
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bug className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{bugs.length}</p>
                  <p className="text-sm text-gray-600">Total Reports</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{pendingBugs.length}</p>
                  <p className="text-sm text-gray-600">Pending Review</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Verified').length}</p>
                  <p className="text-sm text-gray-600">Verified</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Rejected').length}</p>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Bug Reports Management</h2>
            
            <div className="space-y-4">
              {bugs.map((bug) => (
                <div key={bug.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{bug.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(bug.status)}`}>
                            {bug.status}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            bug.severity === 'high' ? 'bg-red-100 text-red-800' :
                            bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {bug.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          ID: {bug.id} • App: {bug.app_name} • Device: {bug.device}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          Reporter: {bug.anonymous ? 'Anonymous' : bug.reporter_name} • 
                          Submitted: {new Date(bug.submitted_at).toLocaleDateString()} • 
                          Est. Review: {bug.review_time}h
                        </p>
                        <div className="text-sm text-gray-700 space-y-2">
                          <div><strong>Description:</strong> {bug.description}</div>
                          <div><strong>Steps:</strong> {bug.steps}</div>
                        </div>
                      </div>
                    </div>
                    
                    {(bug.status === 'Submitted' || bug.status === 'In Review') && (
                      <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => updateBugStatus(bug.id, 'In Review')}
                          disabled={bug.status === 'In Review' || loading}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                        >
                          Mark In Review
                        </button>
                        <button
                          onClick={() => updateBugStatus(bug.id, 'Verified', getPointsForSeverity(bug.severity))}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Verify & Award {getPointsForSeverity(bug.severity)} pts
                        </button>
                        <button
                          onClick={() => updateBugStatus(bug.id, 'Rejected')}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => updateBugStatus(bug.id, 'Fixed')}
                          disabled={loading}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Mark Fixed
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {bugs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No bug reports yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LoadingSpinner />
      <div className="text-center">
        <Bug className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we load your dashboard</p>
      </div>
    </div>
  );
};
};

export default BugBuzzers;
