// PART 1: Imports, State Setup, and Core Functions
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Megaphone, Trophy, Shield, Upload, Eye, EyeOff, Star, Clock, CheckCircle, XCircle, AlertCircle, User, LogOut, Menu, X, Plus, FileText, Award, BarChart3, Settings, Home } from 'lucide-react';
import api from './api';

const BugBuzzers = () => {
  const [currentView, setCurrentView] = useState('landing');
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordForm, setForgotPasswordForm] = useState({ email: '' });
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirmPassword: '' });
  
  // Forms state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
const [bugForm, setBugForm] = useState({
  title: '', 
  description: '', 
  steps: '', 
  device: '', 
  severity: 'medium', 
  appName: '', 
  category: 'others',
  anonymous: false, 
  attachment: null,
  mediaFiles: [],
  mediaUrls: [],
  stepImages: []
});

  // Data state
  const [bugs, setBugs] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Social state variables
  const [socialFeed, setSocialFeed] = useState([]);
  const [feedFilter, setFeedFilter] = useState('trending');
  const [feedLoading, setFeedLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Email verification handler function
  const handleEmailVerification = async (token) => {
    console.log('🔍 Starting email verification for token:', token?.substring(0, 10) + '...');
    
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Email verification successful:', result);
        
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
          const userResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          
          if (userResponse.ok) {
            const freshUserData = await userResponse.json();
            console.log('🔍 Updated user data after verification:', freshUserData);
            setUser(freshUserData);
          }
        }
        
        setCurrentView('verify-email');
        
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

  // Data loading functions
const loadUserBugs = useCallback(async () => {
  try {
    const bugsData = await api.getBugs();
    setBugs(bugsData.filter(bug => bug.user_id === user?.id));
  } catch (error) {
    setBugs([
      { id: 'BUG-001', title: 'Login button not working', status: 'Verified', severity: 'high', points: 500, submitted_at: '2025-01-15T10:30:00Z' },
      { id: 'BUG-003', title: 'Page loading slowly', status: 'Submitted', severity: 'medium', points: 0, submitted_at: '2025-01-13T09:15:00Z' }
    ]);
  }
}, [user?.id]);

	const loadAllBugs = useCallback(async () => {
  try {
    const bugsData = await api.getBugs();
    setBugs(bugsData); // Show ALL bugs, not filtered by user
  } catch (error) {
    setBugs([
      { id: 'BUG-001', title: 'Login button not working', status: 'Verified', severity: 'high', points: 500, submitted_at: '2025-01-15T10:30:00Z', reporter_name: 'John Doe', user_id: 1 },
      { id: 'BUG-002', title: 'Typo in welcome message', status: 'In Review', severity: 'low', points: 0, submitted_at: '2025-01-14T15:45:00Z', reporter_name: 'Jane Smith', user_id: 2 },
      { id: 'BUG-003', title: 'Page loading slowly', status: 'Submitted', severity: 'medium', points: 0, submitted_at: '2025-01-13T09:15:00Z', reporter_name: 'Mike Johnson', user_id: 3 }
    ]);
  }
}, []);
  const loadBugs = useCallback(async () => {
    try {
      const bugsData = await api.getBugs();
      setBugs(bugsData);
    } catch (error) {
      setBugs([
        { id: 'BUG-001', title: 'Login button not working', status: 'Verified', severity: 'high', points: 500, submitted_at: '2025-01-15T10:30:00Z', reporter_name: 'John Doe' },
        { id: 'BUG-002', title: 'Typo in welcome message', status: 'In Review', severity: 'low', points: 0, submitted_at: '2025-01-14T15:45:00Z', reporter_name: 'Jane Smith' }
      ]);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    try {
      const leaderboardData = await api.getLeaderboard();
      setLeaderboard(leaderboardData);
    } catch (error) {
      setLeaderboard([
        { name: 'John Doe', points: 1250, bugs_reported: 5 },
        { name: 'Jane Smith', points: 980, bugs_reported: 3 },
        { name: 'Mike Johnson', points: 750, bugs_reported: 4 }
      ]);
    }
  }, []);

  // useEffect hooks
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 useEffect triggered - checking for stored token');

      if (window.location.pathname === '/reset-password') {
        const urlParams = new URLSearchParams(window.location.search);
        const resetToken = urlParams.get('token');
        
        if (resetToken) {
          setCurrentView('reset-password');
          return;
        } else {
          setError('Invalid reset link');
          setCurrentView('landing');
          return;
        }
      }

      const urlParams = new URLSearchParams(window.location.search);
      const verificationToken = urlParams.get('token');
      
      if (window.location.pathname === '/verify-email' && verificationToken) {
        console.log('🔍 Found verification token in URL, handling verification');
        await handleEmailVerification(verificationToken);
        return;
      }

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

          const userFromToken = {
            id: payload.id,
            email: payload.email,
            name: payload.name || 'User',
            points: payload.points || 0,
            isAdmin: payload.isAdmin || false,
            emailVerified: payload.emailVerified || false
          };
          
          setUser(userFromToken);
          setCurrentView(userFromToken.isAdmin ? 'admin' : 'social-feed');
          
          try {
            const response = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
              const freshUserData = await response.json();
              console.log('🔍 Fresh user data loaded:', freshUserData);
              setUser(freshUserData);
            }
          } catch (error) {
            console.log('Could not fetch fresh user data:', error);
          }
          
        } catch (error) {
          console.error('Token parsing error:', error);
          localStorage.removeItem('token');
          setCurrentView('landing');
        }
      } else {
        setCurrentView('landing');
      }
    };

    initializeAuth();
  }, []);

useEffect(() => {
  const loadUserData = async () => {
    if (user && currentView !== 'landing' && currentView !== 'login' && currentView !== 'signup') {
      try {
        if (user.isAdmin) {
          // Admin sees all bugs
          await loadAllBugs();
        } else if (currentView === 'social-feed' || currentView === 'trending') {
          // Social feed shows all bugs for everyone
          await loadAllBugs();
        } else if (currentView === 'bugs') {
          // "My Bugs" view shows only user's own bugs
          await loadUserBugs();
        } else {
          // Default: show all bugs
          await loadAllBugs();
        }
        await loadLeaderboard();
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load data. Please refresh the page.');
      }
    }
  };

  loadUserData();
}, [user?.id, user?.isAdmin, currentView, loadAllBugs, loadUserBugs, loadLeaderboard]);

  useEffect(() => {
    if (user && currentView === 'dashboard') {
      setCurrentView('social-feed');
    }
  }, [user?.id, currentView]);

useEffect(() => {
  let intervalId;
  
  if (user && (currentView === 'social-feed' || currentView === 'trending')) {
    intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAllBugs(); // Load all bugs, not just user's bugs
      }
    }, 30 * 1000); // 30 seconds
  }

  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}, [user?.id, currentView, loadAllBugs]);

  // Helper functions
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

// PART 2: Event Handlers and Form Functions
  
  // Authentication handlers
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
      setCurrentView(userData.isAdmin ? 'admin' : 'social-feed');
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      console.log('API login failed, checking demo accounts:', error.message);
      
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
      setCurrentView('social-feed');
      setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.log('API signup failed, using demo mode:', error.message);
      
      const demoUser = {
        id: Date.now(),
        name: signupForm.name,
        email: signupForm.email,
        points: 0,
        isAdmin: false
      };
      
      const fakeToken = btoa(JSON.stringify({
        id: demoUser.id,
        email: demoUser.email,
        isAdmin: false
      }));
      localStorage.setItem('token', fakeToken);
      
      setUser(demoUser);
      setCurrentView('social-feed');
      setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
      
      alert('Account created successfully! (Demo mode)');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotPasswordForm.email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: forgotPasswordForm.email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        setCurrentView('login');
        setForgotPasswordForm({ email: '' });
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (resetPasswordForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (!token) {
        setError('Invalid reset link');
        return;
      }
      
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: token,
          password: resetPasswordForm.password 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message);
        setCurrentView('login');
        setResetPasswordForm({ password: '', confirmPassword: '' });
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

const handleMediaUpload = (e) => {
  const files = Array.from(e.target.files);
  const maxFileSize = 2 * 1024 * 1024; // 2MB per file
  const maxTotalFiles = 10; // Increase to 10 for step images
  
  const validFiles = files.filter(file => {
    if (file.size > maxFileSize) {
      alert(`File "${file.name}" is too large. Maximum size is 2MB per file.`);
      return false;
    }
    
    const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!isValidType) {
      alert(`File "${file.name}" is not a valid image or video file.`);
      return false;
    }
    
    return true;
  });

  const currentFiles = bugForm.mediaFiles || [];
  if (currentFiles.length + validFiles.length > maxTotalFiles) {
    alert(`You can only upload up to ${maxTotalFiles} files total.`);
    return;
  }

  const filesWithPreviews = validFiles.map((file, index) => {
    const preview = URL.createObjectURL(file);
    return {
      file,
      preview,
      name: file.name,
      size: file.size,
      type: file.type,
      stepDescription: `Step ${currentFiles.length + index + 1}`, // Add step description
      stepNumber: currentFiles.length + index + 1
    };
  });

  setBugForm(prev => ({
    ...prev,
    mediaFiles: [...currentFiles, ...filesWithPreviews]
  }));
};
const updateStepDescription = (index, description) => {
  setBugForm(prev => ({
    ...prev,
    mediaFiles: prev.mediaFiles.map((file, i) => 
      i === index ? { ...file, stepDescription: description } : file
    )
  }));
};
  const removeMediaFile = (indexToRemove) => {
    setBugForm(prev => {
      const newMediaFiles = prev.mediaFiles.filter((_, index) => index !== indexToRemove);
      
      if (prev.mediaFiles[indexToRemove]?.preview) {
        URL.revokeObjectURL(prev.mediaFiles[indexToRemove].preview);
      }
      
      return {
        ...prev,
        mediaFiles: newMediaFiles
      };
    });
  };

const uploadMediaFiles = async (mediaFiles) => {
  try {
    const formData = new FormData();
    
    // Add each file to form data
    mediaFiles.forEach((mediaFile, index) => {
      formData.append('media', mediaFile.file);
    });

    // Add user name and bug info to form data
    formData.append('userName', user.name);
    if (bugForm.title) {
      formData.append('bugTitle', bugForm.title);
    }

    console.log(`📤 Uploading ${mediaFiles.length} files for user ${user.name}...`);

    const response = await fetch('/api/upload-media', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
        // Note: Don't set Content-Type header when using FormData
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    const data = await response.json();
    console.log(`✅ Files uploaded successfully for user ${user.name}`);
    
    return data.files;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }
};

const handleBugSubmit = async (e) => {
  e.preventDefault();

  if (!user?.emailVerified) {
    setError('Please verify your email address before reporting bugs.');
    return;
  }

  setLoading(true);
  setError('');
  
  try {
    let uploadedMediaUrls = [];
    
    if (bugForm.mediaFiles && bugForm.mediaFiles.length > 0) {
      console.log('📤 Uploading media files...');
      uploadedMediaUrls = await uploadMediaFiles(bugForm.mediaFiles);
      console.log('✅ Media uploaded successfully');
    }

// In handleBugSubmit function, modify the bugData object:
const bugData = {
  title: bugForm.title,
  description: bugForm.description,
  steps: bugForm.steps,
  device: bugForm.device,
  severity: bugForm.severity,
  appName: bugForm.appName,
  anonymous: bugForm.anonymous,
  category: bugForm.category,
  mediaUrls: uploadedMediaUrls,
  stepDescriptions: bugForm.mediaFiles.map(file => file.stepDescription || '') // Add this
};

    const newBug = await api.createBug(bugData);
    
    // Clear form
    setBugForm({
      title: '', 
      description: '', 
      steps: '', 
      device: '', 
      severity: 'medium', 
      appName: '', 
      anonymous: false, 
      attachment: null,
      mediaFiles: [],
      mediaUrls: [],
      category: 'others'
    });
    
    // Cleanup preview URLs
    bugForm.mediaFiles?.forEach(mediaFile => {
      if (mediaFile.preview) {
        URL.revokeObjectURL(mediaFile.preview);
      }
    });
    
    // Add reporter name to the new bug for immediate display
    const newBugWithReporter = {
      ...newBug,
      reporter_name: newBug.anonymous ? null : user.name,
      user_id: user.id
    };
    
    // IMMEDIATELY update the bugs list and go to feed
    setBugs(prevBugs => [newBugWithReporter, ...prevBugs]);
    
    alert(`Bug submitted successfully! Your bug ID is ${newBug.id}`);
    setCurrentView('social-feed');
    
    // Also reload to ensure fresh data from server
    setTimeout(() => {
      loadAllBugs(); // Load all bugs to show the new one in the feed
    }, 1000);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

  React.useEffect(() => {
    return () => {
      bugForm.mediaFiles?.forEach(mediaFile => {
        if (mediaFile.preview) {
          URL.revokeObjectURL(mediaFile.preview);
        }
      });
    };
  }, [bugForm.mediaFiles]);

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${sizes[i]}`;
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
      setCurrentView(isAdmin ? 'admin' : 'social-feed');
    } catch (error) {
      const demoUser = {
        id: isAdmin ? 2 : 1,
        name: isAdmin ? 'Admin User' : 'John Doe',
        email: email,
        points: isAdmin ? 0 : 1250,
        isAdmin: isAdmin
      };
      setUser(demoUser);
      setCurrentView(isAdmin ? 'admin' : 'social-feed');
    } finally {
      setLoading(false);
    }
  };
// Replace the existing MediaDisplay component with:
const MediaDisplay = ({ mediaUrls, maxDisplay = 4 }) => {
  const [showCarousel, setShowCarousel] = useState(false);
  
  if (!mediaUrls || mediaUrls.length === 0) return null;

  // Convert URLs to format expected by carousel
  const mediaFiles = mediaUrls.map((media, index) => ({
    url: typeof media === 'string' ? media : media.url,
    type: typeof media === 'string' ? 
      (media.includes('.mp4') || media.includes('.webm') ? 'video/mp4' : 'image/jpeg') : 
      media.type,
    stepDescription: typeof media === 'object' ? media.stepDescription : `Step ${index + 1}`,
    stepNumber: index + 1
  }));

  if (showCarousel) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-auto">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bug Steps</h3>
              <button
                onClick={() => setShowCarousel(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <MediaCarousel 
              mediaFiles={mediaFiles}
              readOnly={true}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="grid grid-cols-2 gap-2 max-w-md">
        {mediaUrls.slice(0, maxDisplay).map((media, index) => {
          const mediaUrl = typeof media === 'string' ? media : media.url;
          const isVideo = mediaUrl.includes('.mp4') || mediaUrl.includes('.webm') || mediaUrl.includes('.mov');
          
          return (
            <div key={index} className="relative group cursor-pointer" onClick={() => setShowCarousel(true)}>
              {isVideo ? (
                <div className="relative">
                  <video 
                    src={mediaUrl}
                    className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black bg-opacity-50 rounded-full p-2">
                      <span className="text-white text-lg">▶️</span>
                    </div>
                  </div>
                </div>
              ) : (
                <img 
                  src={mediaUrl} 
                  alt={`Bug step ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
              )}
              
              <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                Step {index + 1}
              </div>
              
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                <span className="text-white text-xs">
                  {isVideo ? '🎬' : '🖼️'}
                </span>
              </div>
            </div>
          );
        })}
        
        {mediaUrls.length > maxDisplay && (
          <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => setShowCarousel(true)}>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">+{mediaUrls.length - maxDisplay}</div>
              <div className="text-xs text-gray-500">more steps</div>
            </div>
          </div>
        )}
      </div>
      
      {mediaUrls.length > 0 && (
        <button
          onClick={() => setShowCarousel(true)}
          className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          📱 View Step-by-Step Guide →
        </button>
      )}
    </div>
  );
};
// Add this component after the MediaDisplay component
const MediaCarousel = ({ mediaFiles, onUpdateDescription, onRemoveFile, readOnly = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!mediaFiles || mediaFiles.length === 0) return null;

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaFiles.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaFiles.length) % mediaFiles.length);
  };

  const currentFile = mediaFiles[currentIndex];
  const isVideo = currentFile.type?.startsWith('video/') || currentFile.url?.includes('.mp4');

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">
          Media ({currentIndex + 1} of {mediaFiles.length})
        </h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onRemoveFile(currentIndex)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Remove
          </button>
        )}
      </div>

      {/* Main Image/Video Display */}
      <div className="relative mb-4">
        <div className="aspect-video bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <video 
              src={currentFile.preview || currentFile.url}
              className="max-w-full max-h-full object-contain"
              controls
            />
          ) : (
            <img 
              src={currentFile.preview || currentFile.url}
              alt={`Step ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain cursor-pointer"
              onClick={() => window.open(currentFile.preview || currentFile.url, '_blank')}
            />
          )}
        </div>

        {/* Navigation Arrows */}
        {mediaFiles.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-opacity"
            >
              ←
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-opacity"
            >
              →
            </button>
          </>
        )}

        {/* Step Indicator */}
        <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-sm font-medium">
          Step {currentFile.stepNumber || currentIndex + 1}
        </div>
      </div>

      {/* Step Description Input */}
      {!readOnly && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Step Description
          </label>
          <input
            type="text"
            value={currentFile.stepDescription || ''}
            onChange={(e) => onUpdateDescription(currentIndex, e.target.value)}
            placeholder={`Describe what happens in step ${currentIndex + 1}...`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          />
        </div>
      )}

      {/* Thumbnail Navigation */}
      {mediaFiles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mediaFiles.map((file, index) => {
            const isVideoThumb = file.type?.startsWith('video/') || file.url?.includes('.mp4');
            return (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 relative ${
                  index === currentIndex ? 'ring-2 ring-purple-500' : ''
                } rounded-lg overflow-hidden`}
              >
                {isVideoThumb ? (
                  <div className="w-16 h-16 bg-gray-200 flex items-center justify-center">
                    <span className="text-xs">🎬</span>
                  </div>
                ) : (
                  <img 
                    src={file.preview || file.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-16 h-16 object-cover"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 text-center">
                  {index + 1}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

  // UI Components
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

  const EmailVerificationBanner = () => {
    const [resending, setResending] = useState(false);
    const [checking, setChecking] = useState(false);
    
    const resendVerification = async () => {
      setResending(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in again to resend verification email.');
          return;
        }

        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          alert('Verification email sent! Please check your inbox (including spam folder).');
        } else {
          const error = await response.json();
          alert(`Failed to send verification email: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Resend verification error:', error);
        alert('Error sending verification email. Please try again.');
      } finally {
        setResending(false);
      }
    };

    const checkVerificationStatus = async () => {
      setChecking(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in again.');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('🔍 Verification status check:', userData);
          
          if (userData.emailVerified) {
            setUser(userData);
            alert('✅ Email verification confirmed! You now have full access.');
          } else {
            alert('❌ Email is not yet verified. Please check your email and click the verification link.');
          }
        } else {
          alert('Failed to check verification status. Please try logging in again.');
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        alert('Error checking verification status.');
      } finally {
        setChecking(false);
      }
    };

    if (!user || user.emailVerified) {
      return null;
    }

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
                className="font-medium underline hover:text-yellow-600 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              {' · '}
              <button
                onClick={checkVerificationStatus}
                disabled={checking}
                className="font-medium underline hover:text-yellow-600 disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'Already verified? Refresh status'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  };

const SocialNavigation = () => (
  <nav className="bg-white shadow-sm border-b sticky top-0 z-40">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐛</span>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              BugBuzzers
            </span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">
              BB
            </span>
          </div>
        </div>

        {/* Navigation Links - Desktop */}
        <div className="hidden md:flex items-center space-x-2">
          <button
            onClick={() => {
              setCurrentView('social-feed');
              setTimeout(() => loadAllBugs(), 100);
            }}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentView === 'social-feed' 
                ? 'text-purple-600 bg-purple-50 shadow-sm' 
                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            Feed
          </button>
          
          <button
            onClick={() => {
              setCurrentView('trending');
              setTimeout(() => loadAllBugs(), 100);
            }}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentView === 'trending' 
                ? 'text-purple-600 bg-purple-50 shadow-sm' 
                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <span className="w-4 h-4 mr-2">🔥</span>
            Trending
          </button>
          
          <button
            onClick={() => {
              setCurrentView('bugs');
              setTimeout(() => loadUserBugs(), 100);
            }}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentView === 'bugs' 
                ? 'text-purple-600 bg-purple-50 shadow-sm' 
                : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2v1a2 2 0 01-2-2V5zM16 5a2 2 0 00-2-2v1a2 2 0 012 2v6a2 2 0 01-2 2v1a2 2 0 002-2V5z"/>
            </svg>
            My Bugs
          </button>
          
          <button
            onClick={() => setCurrentView('report')}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105"
          >
            + Report Bug
          </button>
        </div>

        {/* User Menu - DESKTOP */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-lg">
            <span className="text-gray-600">Hi,</span>
            <span className="font-semibold text-gray-900 max-w-20 truncate">{user?.name}</span>
            <div className="w-px h-4 bg-gray-300"></div>
            <span className="text-purple-600 font-bold">{user?.points || 0}</span>
            <span className="text-xs text-purple-500">pts</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 001-1h10.586l-2.293-2.293a1 1 0 10-1.414 1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 101.414 1.414L15.586 11H5a1 1 0 100 2h10.586l-2.293 2.293a1 1 0 101.414 1.414l4-4a1 1 0 000-1.414l-4-4A1 1 0 0015.586 9H5a1 1 0 010-2h10.586l-2.293-2.293a1 1 0 10-1.414 1.414L17.586 8H7a1 1 0 01-1-1V3z"/>
            </svg>
            <span className="hidden lg:inline">Logout</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <div className="text-sm bg-purple-50 px-2 py-1 rounded-lg">
            <span className="text-purple-600 font-bold text-xs">{user?.points || 0}pts</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
          <div className="py-4 space-y-1 px-2">
            <button
              onClick={() => {
                setCurrentView('social-feed');
                setMobileMenuOpen(false);
                setTimeout(() => loadAllBugs(), 100);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 ${
                currentView === 'social-feed' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">🏠</span>
              Feed
            </button>
            <button
              onClick={() => {
                setCurrentView('trending');
                setMobileMenuOpen(false);
                setTimeout(() => loadAllBugs(), 100);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 ${
                currentView === 'trending' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">🔥</span>
              Trending
            </button>
            <button
              onClick={() => {
                setCurrentView('bugs');
                setMobileMenuOpen(false);
                setTimeout(() => loadUserBugs(), 100);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-3 ${
                currentView === 'bugs' ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">📋</span>
              My Bugs
            </button>
            <button
              onClick={() => {
                setCurrentView('report');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 transition-all duration-200 flex items-center gap-3"
            >
              <span className="text-lg">➕</span>
              Report Bug
            </button>
            
            {/* Mobile User Info & Logout */}
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="px-4 py-2 text-sm bg-gray-50 rounded-lg mx-2 mb-2">
                <div className="font-semibold text-gray-900">{user?.name}</div>
                <div className="text-purple-600 font-bold text-lg">{user?.points || 0} points</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 001-1h10.586l-2.293-2.293a1 1 0 10-1.414 1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 101.414 1.414L15.586 11H5a1 1 0 100 2h10.586l-2.293 2.293a1 1 0 101.414 1.414l4-4a1 1 0 000-1.414l-4-4A1 1 0 0015.586 9H5a1 1 0 010-2h10.586l-2.293-2.293a1 1 0 10-1.414 1.414L17.586 8H7a1 1 0 01-1-1V3z"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </nav>
);

  // VIEW 2: Social Feed
// =================== COMPLETE SOCIAL FEED VIEW ===================
// In src/App.js - Replace your entire social-feed view with this:

if (currentView === 'social-feed') {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      <SocialNavigation />
      <EmailVerificationBanner />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-1">{bugs.length}</div>
              <div className="text-xs font-medium text-purple-700">Total Reports</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-2xl lg:text-3xl font-bold text-green-600 mb-1">{leaderboard.length}</div>
              <div className="text-xs font-medium text-green-700">Active Users</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-2xl lg:text-3xl font-bold text-orange-600 mb-1">{bugs.filter(b => b.severity === 'high').length}</div>
              <div className="text-xs font-medium text-orange-700">High Priority</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl lg:text-3xl font-bold text-blue-600 mb-1">{bugs.filter(b => b.status === 'Verified').length}</div>
              <div className="text-xs font-medium text-blue-700">Verified</div>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">🔥 Report Bug by Category</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-4 justify-items-center">
            <div className="text-center">
              <button 
                onClick={() => setCurrentView('report')}
                className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-0.5 cursor-pointer hover:scale-110 transition-all duration-200 mx-auto shadow-lg"
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                  </svg>
                </div>
              </button>
              <p className="text-xs mt-2 text-gray-600 font-medium">Report</p>
            </div>
            
            {[
              { name: 'Social', icon: '📱', gradient: 'from-purple-500 to-pink-500' },
              { name: 'Finance', icon: '💰', gradient: 'from-green-500 to-emerald-500' },
              { name: 'Education', icon: '🎓', gradient: 'from-blue-500 to-indigo-500' },
              { name: 'Shopping', icon: '🛒', gradient: 'from-orange-500 to-red-500' },
              { name: 'Entertainment', icon: '🎬', gradient: 'from-red-600 to-pink-600' },
              { name: 'Transport', icon: '🚗', gradient: 'from-gray-600 to-gray-800' },
              { name: 'Health', icon: '🏥', gradient: 'from-teal-500 to-cyan-500' },
              { name: 'Others', icon: '📋', gradient: 'from-indigo-500 to-purple-600' }
            ].map((category, index) => (
              <div key={index} className="text-center cursor-pointer hover:scale-110 transition-all duration-200">
                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${category.gradient} rounded-full p-0.5 mx-auto shadow-lg`}>
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                    <span className="text-xl sm:text-2xl">{category.icon}</span>
                  </div>
                </div>
                <p className="text-xs mt-2 text-gray-600 font-medium">{category.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex justify-center">
            <div className="flex space-x-2 overflow-x-auto bg-gray-50 rounded-lg p-1">
              {[
                { key: 'all', label: '🔥 All Bugs', icon: '📈' },
                { key: 'recent', label: '🕐 Recent', icon: '⏰' },
                { key: 'high', label: '⚠️ High Priority', icon: '🚨' },
                { key: 'verified', label: '✅ Verified', icon: '🏆' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFeedFilter(filter.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    feedFilter === filter.key
                      ? 'bg-purple-600 text-white shadow-md transform scale-105'
                      : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'
                  }`}
                >
                  <span>{filter.icon}</span>
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className="sm:hidden">{filter.key.charAt(0).toUpperCase() + filter.key.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bug List Section */}
        <div className="space-y-6">
          {bugs.length === 0 ? (
            // Empty state
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-4xl mb-4">🐛</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No bugs reported yet!</h3>
              <p className="text-gray-600 mb-4">Be the first to report a bug and start earning rewards.</p>
              <button
                onClick={() => setCurrentView('report')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 font-medium"
              >
                📸 Report First Bug
              </button>
            </div>
          ) : (
            <>
              {bugs
                .filter(bug => {
                  if (feedFilter === 'recent') return true;
                  if (feedFilter === 'high') return bug.severity === 'high';
                  if (feedFilter === 'verified') return bug.status === 'Verified';
                  return true; // 'all'
                })
                .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                .map((bug) => (
                  <div key={bug.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                    {/* Bug Header */}
                    <div className="flex items-center p-6 border-b border-gray-50">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {bug.reporter_name ? bug.reporter_name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-gray-900 text-lg">
                            {bug.anonymous ? 'Anonymous' : (bug.reporter_name || 'Anonymous')}
                          </span>
                          <span className="text-purple-600 text-sm font-medium">
                            @{bug.anonymous ? 'anonymous' : (bug.reporter_name?.toLowerCase().replace(' ', '') || 'user')}
                          </span>
                          {bug.user_id === user?.id && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
                              YOUR BUG
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            📱 {bug.app_name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            📅 {new Date(bug.submitted_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            💻 {bug.device}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(bug.status)}`}>
                          {bug.status}
                        </span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                          bug.severity === 'high' ? 'bg-red-500 text-white' :
                          bug.severity === 'medium' ? 'bg-orange-500 text-white' :
                          'bg-green-500 text-white'
                        }`}>
                          {bug.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Bug Content */}
                    <div className="px-6 py-4">
                      <h3 className="font-bold text-xl mb-3 text-gray-900 leading-tight">{bug.title}</h3>
                      <p className="text-gray-700 mb-3 leading-relaxed">{bug.description}</p>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold text-gray-900">🔍 Steps to reproduce:</span> {bug.steps}
                        </p>
                      </div>
                      
                      {/* Media Display */}
                      {bug.media_urls && bug.media_urls.length > 0 && (
                        <MediaDisplay mediaUrls={bug.media_urls} maxDisplay={4} />
                      )}

                      {/* Bug Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          #{bug.category || 'general'}
                        </span>
                        {bug.severity === 'high' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                            🚨 Critical
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          ID: {bug.id}
                        </span>
                      </div>
                    </div>

                    {/* Bug Actions */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <button className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-purple-50 transition-colors">
                              <span className="text-xl">🙋‍♀️</span>
                            </div>
                            <span className="text-sm font-medium">I got this too!</span>
                          </button>

                          <button className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                              <span className="text-xl">💬</span>
                            </div>
                            <span className="text-sm font-medium">Comment</span>
                          </button>

                          <button className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors group">
                            <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                              <span className="text-xl">📤</span>
                            </div>
                            <span className="text-sm font-medium">Share</span>
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{bug.points || getPointsForSeverity(bug.severity)} pts</div>
                          <div className="text-xs text-gray-500 font-medium">
                            {bug.status === 'Verified' ? '✅ Earned' : '⏳ Potential'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Call to Action */}
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Join the Bug Hunting Revolution!</h3>
                <p className="text-gray-600 mb-4">Found a bug? Share it with screenshots/videos and earn rewards!</p>
                <button
                  onClick={() => setCurrentView('report')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 font-medium"
                >
                  📸 Report Bug with Media
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// PART 4: Views 3-12 and Component Closing

  // VIEW 3: Trending Page
// VIEW 3: Trending Page - FIXED
if (currentView === 'trending') {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      <SocialNavigation />
      <EmailVerificationBanner />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            🔥 Trending Bugs
            <span className="text-lg bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">
              LIVE
            </span>
          </h1>
          <p className="text-gray-600 mt-2">Most supported bugs trending right now</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{bugs.filter(b => b.supports_count > 0).length || bugs.filter(b => b.severity === 'high' || b.status === 'Verified').length}</div>
                <div className="text-red-100 text-sm font-medium">Active bug reports</div>
              </div>
              <div className="text-5xl opacity-80">🔥</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{bugs.filter(b => b.severity === 'high').length}</div>
                <div className="text-purple-100 text-sm font-medium">Critical priority</div>
              </div>
              <div className="text-5xl opacity-80">⚠️</div>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{bugs.filter(b => b.status === 'Verified').length * 300 || (bugs.length * 200)}</div>
                <div className="text-green-100 text-sm font-medium">Points available</div>
              </div>
              <div className="text-5xl opacity-80">🏆</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">🏆 Top Trending Bugs</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {bugs
              .filter(bug => bug.severity === 'high' || bug.status === 'Verified')
              .sort((a, b) => {
                if (a.severity === 'high' && b.severity !== 'high') return -1;
                if (b.severity === 'high' && a.severity !== 'high') return 1;
                if (a.status === 'Verified' && b.status !== 'Verified') return -1;
                if (b.status === 'Verified' && a.status !== 'Verified') return 1;
                return new Date(b.submitted_at) - new Date(a.submitted_at);
              })
              .slice(0, 5)
              .map((bug, index) => (
                <div key={bug.id} className="px-6 py-5 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                        index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        'bg-gradient-to-r from-purple-500 to-purple-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate text-lg">{bug.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1 font-medium">
                            📱 {bug.app_name}
                          </span>
                          <span className="flex items-center gap-1">
                            👥 {bug.supports_count || Math.floor(Math.random() * 50) + 10}
                          </span>
                          <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                            bug.severity === 'high' ? 'bg-red-100 text-red-700' : 
                            bug.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {bug.severity === 'high' ? '🚨 Critical' : 
                             bug.status === 'Verified' ? '✅ Verified' : '📈 Rising'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="text-2xl font-bold text-green-600">{bug.points || getPointsForSeverity(bug.severity)}</div>
                      <div className="text-xs text-gray-500 font-medium">
                        {bug.status === 'Verified' ? 'Earned' : 'Potential'} pts
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            
            {bugs.filter(bug => bug.severity === 'high' || bug.status === 'Verified').length === 0 && (
              <div className="px-6 py-12 text-center text-gray-500">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No trending bugs yet</h3>
                <p className="text-gray-600">Be the first to report a critical issue and start trending!</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-2">🚀 Want to Go Viral?</h3>
          <p className="mb-6 text-purple-100">Report bugs that thousands of people experience and earn massive rewards!</p>
          <button
            onClick={() => setCurrentView('report')}
            className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105"
          >
            Report a Trending Bug
          </button>
        </div>
      </main>
    </div>
  );
}
  // VIEW 4: Login Page
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
  <div className="flex items-center justify-center gap-2 mb-4">
    <span className="text-3xl">🐛</span>
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
              
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setCurrentView('forgot-password')}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Forgot your password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

           <div className="mt-6 space-y-3">
  <button
    type="button"
    onClick={() => quickLogin('john@example.com', 'password123', false)}
    disabled={loading}
    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm disabled:opacity-50 shadow-md"
  >
    🚀 Quick Login as User (John)
  </button>
  <button
    type="button"
    onClick={() => quickLogin('admin@bugbuzzers.com', 'admin123', true)}
    disabled={loading}
    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm disabled:opacity-50 shadow-md"
  >
    👨‍💼 Quick Login as Admin
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

  // VIEW 5: Signup Page
// VIEW 5: Signup Page - FIXED
if (currentView === 'signup') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <LoadingSpinner />
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-3xl">🐛</span>
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

if (currentView === 'report') {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      <SocialNavigation />
      <EmailVerificationBanner /> 
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Report a Bug</h1>
          <p className="text-gray-600 mt-2">Help us improve by reporting bugs you find. Add screenshots or videos to get more support!</p>
        </div>

        <form onSubmit={handleBugSubmit} className="bg-white rounded-lg shadow-sm p-8">
          <ErrorMessage />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                placeholder="Name of the application"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              value={bugForm.description}
              onChange={(e) => setBugForm({...bugForm, description: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows="4"
              placeholder="Detailed description of what happened"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Steps to Reproduce *</label>
            <textarea
              value={bugForm.steps}
              onChange={(e) => setBugForm({...bugForm, steps: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows="4"
              placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
              required
              disabled={loading}
            />
          </div>

          {/* NEW: Media Upload Section */}
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    📸 Screenshots/Videos with Step Descriptions <span className="text-gray-500">(Highly recommended!)</span>
  </label>
            {/* Upload Area */}
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
    <input
      type="file"
      accept="image/*,video/*"
      multiple
      onChange={handleMediaUpload}
      className="hidden"
      id="media-upload"
      disabled={loading}
    />
    <label 
      htmlFor="media-upload" 
      className="cursor-pointer flex flex-col items-center"
    >
      <Upload className="w-12 h-12 text-gray-400 mb-4" />
      <div className="text-lg font-medium text-gray-900 mb-2">
        Upload Screenshots or Videos
      </div>
      <div className="text-sm text-gray-500 mb-4">
        Upload images/videos for each step of your bug reproduction
      </div>
      <div className="text-xs text-gray-400">
        Supported: JPG, PNG, GIF, MP4, MOV, WebM • Max 2MB per file • Up to 10 files
      </div>
    </label>
  </div>
 {/* Media Carousel */}
  {bugForm.mediaFiles && bugForm.mediaFiles.length > 0 && (
    <MediaCarousel 
      mediaFiles={bugForm.mediaFiles}
      onUpdateDescription={updateStepDescription}
      onRemoveFile={removeMediaFile}
      readOnly={false}
    />
  )}
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Device/Browser *</label>
    <input
      type="text"
      value={bugForm.device}
      onChange={(e) => setBugForm({...bugForm, device: e.target.value})}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      placeholder="e.g., Chrome 120, iPhone 15, Windows 11"
      required
      disabled={loading}
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
    <select
      value={bugForm.severity}
      onChange={(e) => setBugForm({...bugForm, severity: e.target.value})}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      disabled={loading}
    >
      <option value="low">Low (150 pts) - Minor issues</option>
      <option value="medium">Medium (300 pts) - Affects functionality</option>
      <option value="high">High (500 pts) - Critical issues</option>
    </select>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
    <select
      value={bugForm.category || 'others'}
      onChange={(e) => setBugForm({...bugForm, category: e.target.value})}
      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      disabled={loading}
    >
      <option value="social-media">Social Media</option>
      <option value="finance">Finance</option>
      <option value="education">Education</option>
      <option value="e-commerce">E-commerce</option>
      <option value="entertainment">Entertainment</option>
      <option value="transportation">Transportation</option>
      <option value="healthcare">Healthcare</option>
      <option value="productivity">Productivity</option>
      <option value="games">Games</option>
      <option value="news">News</option>
      <option value="others">Others</option>
    </select>
  </div>
</div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={bugForm.anonymous}
                onChange={(e) => setBugForm({...bugForm, anonymous: e.target.checked})}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                disabled={loading}
              />
              <span className="ml-2 text-sm text-gray-700">Submit anonymously</span>
            </label>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tips for Better Bug Reports</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Add screenshots/videos</strong> - Get 3x more support from the community!</li>
              <li>• <strong>Be specific</strong> - Detailed descriptions help others reproduce the bug</li>
              <li>• <strong>Include your device info</strong> - Helps identify if it's device-specific</li>
              <li>• Your bug will be reviewed within approximately {getEstimatedReviewTime(bugForm.severity)} hours</li>
              <li>• If verified, you'll earn {getPointsForSeverity(bugForm.severity)} points + social bonuses!</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setCurrentView('social-feed')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !bugForm.title || !bugForm.description}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Share Bug Report
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

if (currentView === 'bugs') {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      <SocialNavigation />
      <EmailVerificationBanner /> 
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Bug ID</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Severity</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16 text-center">Points</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Submitted</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {bugs.map((bug) => (
        <tr key={bug.id} className="hover:bg-gray-50">
          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bug.id}</td>
          <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">{bug.title}</td>
          <td className="px-4 py-4 whitespace-nowrap">
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
              {bug.status}
            </span>
          </td>
          <td className="px-4 py-4 whitespace-nowrap">
            <span className={`px-2 py-1 text-xs rounded-full ${
              bug.severity === 'high' ? 'bg-red-100 text-red-800' :
              bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {bug.severity}
            </span>
          </td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-bold">{bug.points || 0}</td>
          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
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

  if (currentView === 'leaderboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoadingSpinner />
        <SocialNavigation />
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

// Admin Dashboard View - FIXED
if (currentView === 'admin' && user?.isAdmin) {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      <SocialNavigation />
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Bug ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 text-center">Media</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Reporter</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 text-center">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 text-center">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bugs.map((bug) => (
                    <tr key={bug.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bug.id}</td>
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                        <div className="truncate font-medium">{bug.title}</div>
                        <div className="text-xs text-gray-500 truncate">{bug.app_name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex justify-center">
                          {(() => {
                            let mediaUrls = [];
                            
                            if (bug.media_urls && Array.isArray(bug.media_urls)) {
                              mediaUrls = bug.media_urls;
                            } else if (bug.media_urls_json) {
                              try {
                                mediaUrls = JSON.parse(bug.media_urls_json);
                              } catch (e) {
                                console.error('Error parsing media JSON:', e);
                              }
                            }
                            
                            return mediaUrls.length > 0 ? (
                              <div className="flex gap-1 justify-center">
                                {mediaUrls.slice(0, 2).map((media, index) => (
                                  <img 
                                    key={index} 
                                    src={typeof media === 'string' ? media : media.url} 
                                    alt={`Bug media ${index + 1}`}
                                    className="w-6 h-6 object-cover rounded border cursor-pointer hover:scale-110 transition-transform"
                                    onClick={() => window.open(typeof media === 'string' ? media : media.url, '_blank')}
                                  />
                                ))}
                                {mediaUrls.length > 2 && (
                                  <span className="text-xs text-gray-500 self-center">+{mediaUrls.length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="truncate max-w-20">{bug.reporter_name || 'Anonymous'}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          bug.severity === 'high' ? 'bg-red-100 text-red-800' :
                          bug.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {bug.severity.charAt(0).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(bug.status)}`}>
                          {bug.status === 'Submitted' ? 'Sub' : 
                           bug.status === 'Verified' ? 'Ver' : 
                           bug.status === 'In Review' ? 'Rev' : 
                           bug.status.slice(0, 3)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-center gap-1">
                          {bug.status === 'Submitted' && (
                            <>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Verified', getPointsForSeverity(bug.severity))}
                                className="text-green-600 hover:text-green-900 text-xs px-2 py-1 rounded hover:bg-green-50 transition-colors"
                                disabled={loading}
                                title="Verify Bug"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => updateBugStatus(bug.id, 'Rejected', 0)}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                disabled={loading}
                                title="Reject Bug"
                              >
                                ✗
                              </button>
                            </>
                          )}
                          {bug.status !== 'Submitted' && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
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
  // Forgot Password Page
  if (currentView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
  <div className="flex items-center justify-center gap-2 mb-4">
    <span className="text-3xl">🐛</span>
    <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
  </div>
  <h2 className="text-3xl font-bold text-gray-900">Forgot Password</h2>
  <p className="text-gray-600 mt-2">Enter your email to receive a password reset link</p>
</div>

          <form onSubmit={handleForgotPassword} className="bg-white rounded-lg shadow-sm p-8">
            <ErrorMessage />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={forgotPasswordForm.email}
                onChange={(e) => setForgotPasswordForm({email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your email address"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600">
                Remember your password?{' '}
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

  // Reset Password Page
  if (currentView === 'reset-password') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <LoadingSpinner />
        <div className="max-w-md w-full">
         <div className="text-center mb-8">
  <div className="flex items-center justify-center gap-2 mb-4">
    <span className="text-3xl">🐛</span>
    <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
  </div>
  <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
  <p className="text-gray-600 mt-2">Enter your new password</p>
</div>

          <form onSubmit={handleResetPassword} className="bg-white rounded-lg shadow-sm p-8">
            <ErrorMessage />
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                value={resetPasswordForm.password}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, password: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter new password (min 6 characters)"
                required
                minLength="6"
                disabled={loading}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Confirm your new password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Remember your password?{' '}
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

if (currentView === 'verify-email') {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
          <p className="text-gray-600 mb-6">Your email has been successfully verified. You now have full access to all features.</p>
          <button
            onClick={() => setCurrentView(user?.isAdmin ? 'admin' : 'social-feed')}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// Landing Page - Fixed JSX closing tag issue
if (currentView === 'landing') {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingSpinner />
      
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl">🐛</span>
              <span className="ml-2 text-xl font-bold text-gray-900">BugBuzzers</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView('login')}
                className="text-gray-700 hover:text-purple-600 font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentView('signup')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl">🐛</span>
            <span className="text-2xl font-bold text-gray-900">BugBuzzers</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn Bug Reports Into 
            <span className="text-purple-600"> Social Rewards</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join the community of bug hunters earning real money by reporting issues in your favorite apps and websites.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setCurrentView('signup')}
              className="px-8 py-4 bg-purple-600 text-white rounded-lg text-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Start Hunting Bugs 🐛
            </button>
            <button
              onClick={() => setCurrentView('login')}
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-lg text-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Earn Rewards</h3>
            <p className="text-gray-600">Get paid for every verified bug you report. Top hunters earn thousands!</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Make Apps Better</h3>
            <p className="text-gray-600">Help improve the apps and websites millions of people use every day.</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Join Community</h3>
            <p className="text-gray-600">Connect with fellow bug hunters and share your discoveries.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
// Default fallback - ENSURE THIS IS THE LAST RETURN STATEMENT
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Megaphone className="w-16 h-16 text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait while we load your dashboard</p>
        <button 
          onClick={() => setCurrentView('landing')}
          className="mt-4 text-purple-600 hover:text-purple-700"
        >
          Go to Home Page
        </button>
      </div>
    </div>
  );
}; // <-- CLOSING BRACE FOR BugBuzzers COMPONENT

export default BugBuzzers; // <-- EXPORT STATEMENT
