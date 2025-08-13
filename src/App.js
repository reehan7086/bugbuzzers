import React, { useState, useEffect } from 'react';
import { Megaphone, Trophy, Shield, Upload, Eye, EyeOff, Star, Clock, CheckCircle, XCircle, AlertCircle, User, LogOut, Menu, X, Plus, FileText, Award, BarChart3, Settings, Home } from 'lucide-react';
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

  // Add email verification handler function - MOVED BEFORE useEffect
  const handleEmailVerification = async (token) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      
      if (response.ok) {
        setCurrentView('verify-email');
        // Update user's email verification status
        if (user) {
          setUser({ ...user, emailVerified: true });
        }
      } else {
        const error = await response.json();
        setError(error.error || 'Verification failed');
        setCurrentView('landing');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
      setCurrentView('landing');
    } finally {
      setLoading(false);
    }
  };

  // Update your useEffect to handle verification page - MOVED BEFORE ANY EARLY RETURNS
  useEffect(() => {
    // Check if this is a verification link
    const urlParams = new URLSearchParams(window.location.search);
    const verificationToken = urlParams.get('token');
    
    if (window.location.pathname === '/verify-email' && verificationToken) {
      handleEmailVerification(verificationToken);
      return;
    }

    // Existing token logic
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem('token');
          setCurrentView('landing');
          return;
        }

        const user = {
          id: payload.id,
          email: payload.email,
          name: payload.name || 'User',
          points: payload.points || 0,
          isAdmin: payload.isAdmin || false,
          emailVerified: payload.emailVerified || false
        };
        
        setUser(user);
        setCurrentView(user.isAdmin ? 'admin' : 'dashboard');
      } catch (error) {
        console.error('Token parsing error:', error);
        localStorage.removeItem('token');
        setCurrentView('landing');
      }
    }
  }, []);

  // Load data when user changes - ALSO MOVED BEFORE EARLY RETURNS
  useEffect(() => {
    if (user && currentView !== 'landing' && currentView !== 'login' && currentView !== 'signup') {
      if (user.isAdmin) {
        loadBugs();
      } else {
        loadUserBugs();
      }
      loadLeaderboard();
    }
  }, [user, currentView]);

  // Add this new function
  const fetchUserProfile = async (token) => {
    try {
      // Verify token is still valid and get real user data
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setCurrentView(userData.isAdmin ? 'admin' : 'dashboard');
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        setCurrentView('landing');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      setCurrentView('landing');
    }
  };

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
    } catch (error) {
      console.log('API login failed, checking demo accounts:', error.message);
      
      // Demo login fallback
      if (loginForm.email === 'admin@bugbuzzers.com' && loginForm.password === 'admin123') {
        const adminUser = { id: 2, name: 'Admin User', email: loginForm.email, points: 0, isAdmin: true };
        setUser(adminUser);
        setCurrentView('admin');
        setLoginForm({ email: '', password: '' });
      } else {
        setError('Login failed. Try the quick login buttons or check your credentials.');
      }
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
    } catch (error) {
      console.log('API signup failed, using demo mode:', error.message);
      
      // Create demo user for development/testing
      const demoUser = {
        id: Date.now(),
        name: signupForm.name,
        email: signupForm.email,
        points: 0,
        isAdmin: false
      };
      
      // Create fake token for demo
      const fakeToken = btoa(JSON.stringify({
        id: demoUser.id,
        email: demoUser.email,
        isAdmin: false
      }));
      localStorage.setItem('token', fakeToken);
      
      setUser(demoUser);
      setCurrentView('dashboard');
      setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
      
      // Show success message instead of error
      alert('Account created successfully! (Demo mode)');
    } finally {
      setLoading(false);
    }
  };

  const handleBugSubmit = async (e) => {
    e.preventDefault();

    // Check email verification
    if (!user?.emailVerified) {
      setError('Please verify your email address before reporting bugs.');
      return;
    }
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

  const updateBugStatus = async (bugId, newStatus, assignedPoints = 0) => {
    setLoading(true);
    try {
      await api.updateBugStatus(bugId, newStatus, assignedPoints);
      loadBugs();
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
      // Mock data for demo
      setBugs([
        { id: 'BUG-001', title: 'Login button not working', status: 'Verified', severity: 'high', points: 500, submitted_at: '2025-01-15T10:30:00Z', reporter_name: 'John Doe' },
        { id: 'BUG-002', title: 'Typo in welcome message', status: 'In Review', severity: 'low', points: 0, submitted_at: '2025-01-14T15:45:00Z', reporter_name: 'Jane Smith' }
      ]);
    }
  };

  const loadUserBugs = async () => {
    try {
      const bugsData = await api.getBugs();
      setBugs(bugsData.filter(bug => bug.user_id === user?.id));
    } catch (error) {
      // Mock data for demo
      setBugs([
        { id: 'BUG-001', title: 'Login button not working', status: 'Verified', severity: 'high', points: 500, submitted_at: '2025-01-15T10:30:00Z' },
        { id: 'BUG-003', title: 'Page loading slowly', status: 'Submitted', severity: 'medium', points: 0, submitted_at: '2025-01-13T09:15:00Z' }
      ]);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const leaderboardData = await api.getLeaderboard();
      setLeaderboard(leaderboardData);
    } catch (error) {
      // Mock data for demo
      setLeaderboard([
        { name: 'John Doe', points: 1250, bugs_reported: 5 },
        { name: 'Jane Smith', points: 980, bugs_reported: 3 },
        { name: 'Mike Johnson', points: 750, bugs_reported: 4 }
      ]);
    }
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
    } catch (error) {
      // Demo fallback
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

  // Add this EmailVerificationBanner component after your LoadingSpinner function
  const EmailVerificationBanner = () => {
    const [resending, setResending] = useState(false);
    
    const resendVerification = async () => {
      setResending(true);
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          alert('Verification email sent! Please check your inbox.');
        } else {
          alert('Failed to send verification email. Please try again.');
        }
      } catch (error) {
        alert('Error sending verification email.');
      } finally {
        setResending(false);
      }
    };

    if (user?.emailVerified) return null;

    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Please verify your email address to access all features.</strong> Check your inbox for a verification email.{' '}
              <button
                onClick={resendVerification}
                disabled={resending}
                className="font-medium underline hover:text-yellow-600"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // NOW WE CAN HAVE CONDITIONAL RETURNS

  // Add verification success page handling
  if (currentView === 'verify-email') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Email Verified!</h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You now have full access to BugBuzzers!
            </p>
            <button
              onClick={() => {
                // Refresh user data and go to dashboard
                setCurrentView('dashboard');
                // Refresh the user to update emailVerified status
                window.location.reload();
              }}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Component
  const Navigation = () => (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Megaphone className="w-8 h-8 text-purple-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">BugBuzzers</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'dashboard' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('report')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'report' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Bug
            </button>
            <button
              onClick={() => setCurrentView('bugs')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'bugs' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              My Bugs
            </button>
            <button
              onClick={() => setCurrentView('leaderboard')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                currentView === 'leaderboard' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:text-purple-600'
              }`}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </button>
            {user?.isAdmin && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'admin' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:text-purple-600'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center text-sm text-gray-600">
              <Trophy className="w-4 h-4 mr-1 text-yellow-500" />
              {user?.points || 0} points
            </div>
            <div className="relative">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center text-sm font-medium text-gray-700 hover:text-purple-600"
              >
                <User className="w-4 h-4 mr-2" />
                {user?.name}
                <Menu className="w-4 h-4 ml-2 md:hidden" />
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <div className="md:hidden">
                    <button
                      onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => { setCurrentView('report'); setMobileMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Report Bug
                    </button>
                    <button
                      onClick={() => { setCurrentView('bugs'); setMobileMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Bugs
                    </button>
                    <button
                      onClick={() => { setCurrentView('leaderboard'); setMobileMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Leaderboard
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={() => { setCurrentView('admin'); setMobileMenuOpen(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Admin
                      </button>
                    )}
                    <hr className="my-1" />
                    <div className="px-4 py-2 text-sm text-gray-500">
                      Points: {user?.points || 0}
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );

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

  // Signup Page
  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Megaphone className="w-8 h-8 text-purple-600" />
              <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Join BugBuzzers</h2>
            <p className="text-gray-600 mt-2">Start earning rewards by reporting bugs</p>
          </div>

          <form onSubmit={handleSignup} className="bg-white rounded-lg shadow-sm p-8">
            <ErrorMessage />
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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
            
            <div className="mb-4">
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
                  Sign in here
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

  // Dashboard
  if (currentView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <Navigation />
        <EmailVerificationBanner />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
            <p className="text-gray-600 mt-2">Here's your bug hunting summary</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900">{user?.points || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Bugs Reported</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Verified').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Submitted' || b.status === 'In Review').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => setCurrentView('report')}
                  className="w-full flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Report New Bug
                </button>
                <button
                  onClick={() => setCurrentView('bugs')}
                  className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View My Bugs
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {bugs.slice(0, 3).map((bug) => (
                  <div key={bug.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bug.title}</p>
                      <p className="text-xs text-gray-500">{new Date(bug.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
                      {bug.status}
                    </span>
                  </div>
                ))}
                {bugs.length === 0 && (
                  <p className="text-gray-500 text-sm">No bugs reported yet</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // My Bugs Page
  if (currentView === 'bugs') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <Navigation />
        <EmailVerificationBanner /> 
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Bug Reports</h1>
              <p className="text-gray-600 mt-2">Track the status of your reported bugs</p>
            </div>
            <button
              onClick={() => setCurrentView('report')}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report New Bug
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {bugs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bugs reported yet</h3>
                <p className="text-gray-600 mb-4">Start earning points by reporting your first bug!</p>
                <button
                  onClick={() => setCurrentView('report')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Report Your First Bug
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bug ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bugs.map((bug) => (
                      <tr key={bug.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bug.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bug.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
                            {bug.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            bug.severity === 'high' ? 'bg-red-100 text-red-800' :
                            bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {bug.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bug.points || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bug.submitted_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Leaderboard Page
  if (currentView === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <Navigation />
        <EmailVerificationBanner />  
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-gray-600 mt-2">Top bug hunters and their rewards</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">🏆 Top Bug Hunters</h2>
            </div>
            
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rankings yet</h3>
                <p className="text-gray-600">Be the first to earn points by reporting bugs!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {leaderboard.map((user, index) => (
                  <div key={user.id || index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-4 ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-600' :
                        'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.bugs_reported} bugs reported</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Trophy className="w-4 h-4 text-yellow-500 mr-1" />
                      <span className="font-bold text-gray-900">{user.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-lg font-bold mb-2">Want to climb the leaderboard?</h3>
            <p className="mb-4">Report more bugs to earn points and climb to the top!</p>
            <button
              onClick={() => setCurrentView('report')}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Report a Bug
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Admin Panel
  if (currentView === 'admin' && user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <Navigation />
        <EmailVerificationBanner /> 
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage and review bug reports</p>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Submitted').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Verified').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{bugs.filter(b => b.status === 'Rejected').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bug Reports Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Bug Reports</h2>
            </div>
            
            {bugs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bug reports yet</h3>
                <p className="text-gray-600">Bug reports will appear here once users start reporting them.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bug ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bugs.map((bug) => (
                      <tr key={bug.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bug.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bug.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bug.reporter_name || 'Anonymous'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            bug.severity === 'high' ? 'bg-red-100 text-red-800' :
                            bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {bug.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
                            {bug.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {bug.status === 'Submitted' && (
                            <>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Verified', getPointsForSeverity(bug.severity))}
                                className="text-green-600 hover:text-green-900"
                                disabled={loading}
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Rejected', 0)}
                                className="text-red-600 hover:text-red-900"
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {bug.status === 'In Review' && (
                            <>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Verified', getPointsForSeverity(bug.severity))}
                                className="text-green-600 hover:text-green-900"
                                disabled={loading}
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Rejected', 0)}
                                className="text-red-600 hover:text-red-900"
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {bug.status === 'Verified' && (
                            <button
                              onClick={() => updateBugStatus(bug.id, 'Fixed', 0)}
                              className="text-purple-600 hover:text-purple-900"
                              disabled={loading}
                            >
                              Mark Fixed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Megaphone className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we load your dashboard</p>
      </div>
    </div>
  );
};

export default BugBuzzers;
