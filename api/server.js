// Force disable SSL verification globally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection - Fixed version
let pool;
try {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('Database URL check:', databaseUrl.substring(0, 30) + '...');

  // Create pool with SSL disabled
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: false, // Force disable SSL
    max: 5,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  });

  console.log('✅ Database pool created successfully (SSL disabled)');
} catch (error) {
  console.error('❌ Database pool creation failed:', error.message);
  
  // Create a dummy pool to prevent crashes
  pool = {
    query: () => Promise.reject(new Error('Database not available')),
    connect: () => Promise.reject(new Error('Database not available'))
  };
}

// Email configuration
let emailTransporter;
try {
  // Verify required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
  }

  emailTransporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    // Add these options for better reliability
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5
  });

  // Test the connection
  emailTransporter.verify((error, success) => {
    if (error) {
      console.error('❌ Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter configured and verified');
    }
  });

} catch (error) {
  console.error('❌ Email transporter setup failed:', error.message);
  // Create dummy transporter for development
  emailTransporter = {
    sendMail: (options) => {
      console.log('📧 DUMMY EMAIL (would send to):', options.to);
      console.log('📧 DUMMY EMAIL (subject):', options.subject);
      return Promise.resolve({ messageId: 'dev-mode-fallback' });
    },
    verify: () => Promise.resolve(true)
  };
}

// Email helper function for verification
async function sendVerificationEmail(email, name, token) {
  const verificationUrl = `${process.env.BASE_URL || 'https://app.bugbuzzers.com'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@bugbuzzers.com',
    to: email,
    subject: 'Verify your BugBuzzers account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐛 BugBuzzers</h1>
          <p style="color: white; margin: 10px 0 0 0;">Welcome to the Bug Bounty Platform</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hi ${name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thanks for joining BugBuzzers! To complete your registration and start earning rewards 
            for reporting bugs, please verify your email address.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 24 hours. If you didn't create an account with BugBuzzers, 
            you can safely ignore this email.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>Happy Bug Hunting! 🕵️‍♀️</p>
          <p style="margin: 5px 0 0 0;">The BugBuzzers Team</p>
        </div>
      </div>
    `
  };

  try {
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Verification email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error);
    return false;
  }
}

// Email helper function for password reset
async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${process.env.BASE_URL || 'https://app.bugbuzzers.com'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@bugbuzzers.com',
    to: email,
    subject: 'Reset your BugBuzzers password',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐛 BugBuzzers</h1>
          <p style="color: white; margin: 10px 0 0 0;">Password Reset Request</p>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hi ${name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password for your BugBuzzers account. 
            If you didn't make this request, you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Your Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes for security reasons.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>Stay secure! 🔒</p>
          <p style="margin: 5px 0 0 0;">The BugBuzzers Team</p>
        </div>
      </div>
    `
  };

  try {
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

// Test database connection
async function testDatabaseConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      retries--;
      console.log(`❌ Database connection attempt failed (${3-retries}/3):`, error.code || error.message);
      if (retries > 0) {
        console.log('⏳ Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.log('❌ All database connection attempts failed');
  return false;
}

// Initialize database tables
async function initDB() {
  try {
    console.log('🔄 Initializing database...');
    
    // Test connection first
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.log('⚠️ Skipping database initialization due to connection issues');
      return;
    }
    
    // Users table with email verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_expires TIMESTAMP,
        reset_token VARCHAR(255),
        reset_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

    // Add columns to existing table if they don't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP');
      console.log('✅ Email verification and password reset columns added');
    } catch (error) {
      console.log('ℹ️ User table columns already exist');
    }

    // Bugs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bugs (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        steps TEXT NOT NULL,
        device VARCHAR(255) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        app_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Submitted',
        points INTEGER DEFAULT 0,
        user_id INTEGER REFERENCES users(id),
        anonymous BOOLEAN DEFAULT FALSE,
        attachment_url VARCHAR(500),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        review_time INTEGER NOT NULL
      )
    `);
    console.log('✅ Bugs table ready');

    // Create default admin user (auto-verified)
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@bugbuzzers.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, password, is_admin, email_verified) VALUES ($1, $2, $3, $4, $5)',
        ['Admin User', 'admin@bugbuzzers.com', hashedPassword, true, true]
      );
      console.log('✅ Admin user created');
    } else {
      // Update existing admin to be verified
      await pool.query('UPDATE users SET email_verified = TRUE WHERE email = $1', ['admin@bugbuzzers.com']);
    }

    console.log('🎉 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('Full error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
  }
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'bugbuzzers-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// ===================== API ROUTES =====================

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        points: user.points,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified
      },
      process.env.JWT_SECRET || 'bugbuzzers-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create user (unverified)
    const result = await pool.query(
      `INSERT INTO users (name, email, password, email_verified, verification_token, verification_expires) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, points, is_admin, email_verified`,
      [name, email, hashedPassword, false, verificationToken, verificationExpires]
    );

    const user = result.rows[0];
    
    // Send verification email
    const emailSent = await sendVerificationEmail(email, name, verificationToken);
    
    // Create token (but mark as unverified)
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        points: user.points,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified
      },
      process.env.JWT_SECRET || 'bugbuzzers-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        isAdmin: user.is_admin,
        emailVerified: user.email_verified
      },
      message: emailSent 
        ? 'Account created! Please check your email to verify your account.' 
        : 'Account created! Email verification unavailable, contact support.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, points, is_admin, email_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points,
      isAdmin: user.is_admin,
      emailVerified: user.email_verified
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Email verification endpoint
app.get('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with this verification token
    const result = await pool.query(
      'SELECT * FROM users WHERE verification_token = $1 AND verification_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = result.rows[0];

    // Verify the email
    await pool.query(
      'UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    res.json({ 
      success: true, 
      message: 'Email verified successfully! You can now access all features.' 
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.rows[0];

    if (userData.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update verification token
    await pool.query(
      'UPDATE users SET verification_token = $1, verification_expires = $2 WHERE id = $3',
      [verificationToken, verificationExpires, userData.id]
    );

    // Send verification email
    const emailSent = await sendVerificationEmail(userData.email, userData.name, verificationToken);

    if (emailSent) {
      res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });
    } else {
      res.status(500).json({ error: 'Failed to send verification email' });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot Password Route
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ success: true, message: 'If your email is registered, you will receive a password reset link.' });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // Send reset email
    const emailSent = await sendPasswordResetEmail(user.email, user.name, resetToken);

    if (emailSent) {
      res.json({ success: true, message: 'If your email is registered, you will receive a password reset link.' });
    } else {
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Find user with valid reset token
    const userResult = await pool.query(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = userResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bug Routes
app.get('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, u.name as reporter_name 
      FROM bugs b 
      LEFT JOIN users u ON b.user_id = u.id 
      ORDER BY b.submitted_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get bugs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const { title, description, steps, device, severity, appName, anonymous } = req.body;
    
    // Generate bug ID
    const bugCount = await pool.query('SELECT COUNT(*) FROM bugs');
    const bugId = `BUG-${String(parseInt(bugCount.rows[0].count) + 1).padStart(3, '0')}`;
    
    const reviewTimes = { high: 6, medium: 4, low: 2 };
    const reviewTime = reviewTimes[severity] || 2;

    const result = await pool.query(`
      INSERT INTO bugs (id, title, description, steps, device, severity, app_name, user_id, anonymous, review_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [bugId, title, description, steps, device, severity, appName, req.user.id, anonymous, reviewTime]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create bug error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/bugs/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, points = 0 } = req.body;

    // Update bug status
    await pool.query('UPDATE bugs SET status = $1, points = $2 WHERE id = $3', [status, points, id]);

    // Award points to user if bug is verified
    if (status === 'Verified' && points > 0) {
      const bug = await pool.query('SELECT user_id FROM bugs WHERE id = $1', [id]);
      if (bug.rows.length > 0) {
        await pool.query('UPDATE users SET points = points + $1 WHERE id = $2', [points, bug.rows[0].user_id]);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update bug status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Other Routes
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, points, 
        (SELECT COUNT(*) FROM bugs WHERE user_id = users.id) as bugs_reported
      FROM users 
      WHERE is_admin = FALSE AND points > 0 
      ORDER BY points DESC 
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test email endpoint for debugging
app.get('/api/test-email', async (req, res) => {
  try {
    console.log('Testing email configuration...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD exists:', !!process.env.EMAIL_PASSWORD);
    
    const testEmail = {
      from: process.env.EMAIL_USER || 'noreply@bugbuzzers.com',
      to: 'test@example.com', // Replace with your email
      subject: 'BugBuzzers Email Test',
      html: `
        <h2>Email Test</h2>
        <p>If you receive this, email is working!</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    };

    const result = await emailTransporter.sendMail(testEmail);
    console.log('✅ Test email sent:', result.messageId);
    res.json({ success: true, messageId: result.messageId });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===================== STATIC FILES (MUST BE LAST) =====================

// Serve React app for all other routes
app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// ===================== START SERVER =====================

// Initialize database and start server
initDB().then(() => {
  app.listen(port, () => {
    console.log(`🚀 BugBuzzers API running on port ${port}`);
  });
});

module.exports = app;
