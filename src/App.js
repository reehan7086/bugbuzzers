import React, { useState, useEffect } from 'react';
import { Bug, Trophy, Shield, Upload, Eye, EyeOff, Star, Clock, CheckCircle, XCircle, AlertCircle, User, LogOut, Menu, X } from 'lucide-react';

const BugBuzzers = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Forms state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [bugForm, setBugForm] = useState({
    title: '', description: '', steps: '', device: '', severity: 'medium', 
    appName: '', anonymous: false, attachment: null
  });

  // Data storage (in production, this would be a database)
  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', password: 'password123', points: 1250, isAdmin: false },
    { id: 2, name: 'Admin User', email: 'admin@bugbuzzers.com', password: 'admin123', points: 0, isAdmin: true }
  ]);
  const [bugs, setBugs] = useState([
    {
      id: 'BUG-001',
      title: 'Login button not working',
      description: 'The login button becomes unresponsive after clicking',
      steps: '1. Go to login page 2. Enter credentials 3. Click login',
      device: 'Chrome 120, Windows 11',
      severity: 'high',
      appName: 'MyApp',
      status: 'Verified',
      points: 500,
      userId: 1,
      anonymous: false,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reviewTime: 6
    }
  ]);

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

  const handleLogin = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!loginForm.email || !loginForm.password) {
      alert('Please enter both email and password');
      return;
    }
    
    const foundUser = users.find(u => 
      u.email.toLowerCase() === loginForm.email.toLowerCase() && 
      u.password === loginForm.password
    );
    
    if (foundUser) {
      setUser(foundUser);
      setCurrentView(foundUser.isAdmin ? 'admin' : 'dashboard');
      setLoginForm({ email: '', password: '' });
    } else {
      alert('Login failed. Use:\nUser: john@example.com / password123\nAdmin: admin@bugbuzzers.com / admin123');
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (users.find(u => u.email === signupForm.email)) {
      alert('Email already exists');
      return;
    }
    const newUser = {
      id: users.length + 1,
      name: signupForm.name,
      email: signupForm.email,
      password: signupForm.password,
      points: 0,
      isAdmin: false
    };
    setUsers([...users, newUser]);
    setUser(newUser);
    setCurrentView('dashboard');
    setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
  };

  const handleBugSubmit = (e) => {
    e.preventDefault();
    const newBug = {
      id: `BUG-${String(bugs.length + 1).padStart(3, '0')}`,
      ...bugForm,
      status: 'Submitted',
      points: 0,
      userId: user.id,
      submittedAt: new Date(),
      reviewTime: getEstimatedReviewTime(bugForm.severity)
    };
    setBugs([...bugs, newBug]);
    setBugForm({
      title: '', description: '', steps: '', device: '', severity: 'medium', 
      appName: '', anonymous: false, attachment: null
    });
    alert(`Bug submitted successfully! Your bug ID is ${newBug.id}`);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 100 * 1024 * 1024) {
      alert('File size must be under 100MB');
      return;
    }
    setBugForm({ ...bugForm, attachment: file });
  };

  const updateBugStatus = (bugId, newStatus, assignedPoints = 0) => {
    setBugs(bugs.map(bug => {
      if (bug.id === bugId) {
        const updatedBug = { ...bug, status: newStatus };
        if (assignedPoints > 0) {
          updatedBug.points = assignedPoints;
          setUsers(users.map(u => 
            u.id === bug.userId 
              ? { ...u, points: u.points + assignedPoints }
              : u
          ));
        }
        return updatedBug;
      }
      return bug;
    }));
  };

  const getLeaderboard = () => {
    return users
      .filter(u => !u.isAdmin && u.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  };

  const getUserBugs = () => {
    return bugs.filter(bug => bug.userId === user?.id);
  };

  const logout = () => {
    setUser(null);
    setCurrentView('landing');
    setMobileMenuOpen(false);
  };

  // Landing Page
  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500">
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

  return <div>Other views will be added here</div>;
};

export default BugBuzzers;
