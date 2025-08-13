import React, { useState, useEffect } from 'react';
import { Megaphone, Trophy, Shield, Upload, Eye, EyeOff, Star, Clock, CheckCircle, XCircle, AlertCircle, User, LogOut, Menu, X } from 'lucide-react';
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
      loadUserBugs();
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
      loadBugs();
      
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

  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
        <button onClick={() => setError('')} className="ml-2 text-red-900 hover:text-red-700">×</button>
      </div>
    );
  };

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
                <Megaphone className="w-8 h-8 text-white" />
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
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Megaphone className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Report Bugs</h3>
                <p className="text-white/80">Found a bug? Report it with screenshots or videos and detailed steps.</p>
              </div>
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Get Verified</h3>
                <p className="text-white/80">Our team verifies your reports within hours based on severity level.</p>
              </div>
              <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
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
              <Megaphone className="w-8 h-8 text-purple-600" />
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

  return <div>Loading other views...</div>;
};

export default BugBuzzers;
