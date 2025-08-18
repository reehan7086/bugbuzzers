// Force disable SSL verification globally
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
// Add a try-catch for nodemailer import
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (error) {
  console.log('⚠️ Nodemailer not installed, email features disabled');
  nodemailer = null;
}
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

  emailTransporter = nodemailer.createTransport({
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
// Enhanced Database Schema for Social Features
// Replace the initDB function in your api/server.js with this enhanced version

async function initDB() {
  try {
    console.log('🔄 Initializing database with social features...');
    
    // Test connection first
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.log('⚠️ Skipping database initialization due to connection issues');
      return;
    }
    
    // Enhanced Users table with social features
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Social profile fields
        username VARCHAR(50) UNIQUE,
        bio TEXT,
        avatar_url VARCHAR(500),
        location VARCHAR(255),
        website VARCHAR(500),
        twitter_handle VARCHAR(50),
        github_handle VARCHAR(50),
        -- Social stats
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        total_supports_received INTEGER DEFAULT 0,
        -- User level/badges
        user_level VARCHAR(50) DEFAULT 'Bug Spotter',
        badges TEXT[],
        -- Activity tracking
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        streak_days INTEGER DEFAULT 0,
        last_streak_date DATE
      )
    `);
    console.log('✅ Enhanced users table ready');

    // Enhanced Bugs table with social features
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
        review_time INTEGER NOT NULL,
        -- Social features
        supports_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        -- Content features
        caption TEXT,
        hashtags TEXT[],
        media_urls TEXT[],
        tagged_users INTEGER[],
        -- Viral tracking
        is_trending BOOLEAN DEFAULT FALSE,
        viral_score INTEGER DEFAULT 0,
        trending_rank INTEGER,
        viral_peak_supports INTEGER DEFAULT 0,
        viral_peak_date TIMESTAMP,
        -- Social validation
        estimated_reward INTEGER DEFAULT 0,
        social_multiplier DECIMAL(3,2) DEFAULT 1.0,
        -- Location and context
        reported_location VARCHAR(255),
        user_agent TEXT,
        screen_resolution VARCHAR(50),
        timezone VARCHAR(100),
        -- Enhanced categorization
        category VARCHAR(50) DEFAULT 'functional',
        sub_category VARCHAR(50),
        impact_level VARCHAR(50) DEFAULT 'some-users',
        frequency VARCHAR(50) DEFAULT 'sometimes',
        environment VARCHAR(50) DEFAULT 'production',
        -- Additional metadata
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Enhanced bugs table ready');

// Bug Supports table (like the "I got this too" feature)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bug_supports (
        id SERIAL PRIMARY KEY,
        bug_id VARCHAR(50) REFERENCES bugs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Support context
        support_type VARCHAR(20) DEFAULT 'experienced', -- experienced, reproduced, affected
        device_info VARCHAR(255),
        additional_context TEXT,
        UNIQUE(bug_id, user_id)
      )
    `);
    console.log('✅ Bug supports table ready');

// Bug Comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bug_comments (
        id SERIAL PRIMARY KEY,
        bug_id VARCHAR(50) REFERENCES bugs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES bug_comments(id) ON DELETE CASCADE,
        comment TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Social features
        likes_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT FALSE,
        -- Media attachments for comments
        media_urls TEXT[]
      )
    `);
    console.log('✅ Bug comments table ready');

    -- User Following system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Follow context
        follow_reason VARCHAR(100), -- found_through_bug, mutual_connection, etc.
        UNIQUE(follower_id, following_id),
        CHECK (follower_id != following_id)
      )
    `);
    console.log('✅ User follows table ready');

    -- Bug Shares tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bug_shares (
        id SERIAL PRIMARY KEY,
        bug_id VARCHAR(50) REFERENCES bugs(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL, -- twitter, facebook, copy_link, internal
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Bug shares table ready');

    -- Trending bugs tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_bugs (
        id SERIAL PRIMARY KEY,
        bug_id VARCHAR(50) REFERENCES bugs(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        rank INTEGER NOT NULL,
        supports_count INTEGER DEFAULT 0,
        viral_score INTEGER DEFAULT 0,
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(bug_id, date)
      )
    `);
    console.log('✅ Trending bugs table ready');

    -- User notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- bug_supported, comment_added, trending, follow, etc.
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        action_url VARCHAR(500),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Context data
        related_bug_id VARCHAR(50),
        related_user_id INTEGER,
        metadata JSONB
      )
    `);
    console.log('✅ Notifications table ready');

    -- User activity feed
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL, -- bug_reported, bug_supported, comment_added, etc.
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Activity context
        related_bug_id VARCHAR(50),
        related_user_id INTEGER,
        points_earned INTEGER DEFAULT 0,
        metadata JSONB
      )
    `);
    console.log('✅ User activities table ready');

    -- Add new columns to existing tables if they don't exist
    const userColumns = [
      'username VARCHAR(50) UNIQUE',
      'bio TEXT',
      'avatar_url VARCHAR(500)',
      'location VARCHAR(255)',
      'website VARCHAR(500)',
      'twitter_handle VARCHAR(50)',
      'github_handle VARCHAR(50)',
      'followers_count INTEGER DEFAULT 0',
      'following_count INTEGER DEFAULT 0',
      'total_supports_received INTEGER DEFAULT 0',
      'user_level VARCHAR(50) DEFAULT \'Bug Spotter\'',
      'badges TEXT[]',
      'last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'streak_days INTEGER DEFAULT 0',
      'last_streak_date DATE'
    ];

    for (const column of userColumns) {
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column}`);
      } catch (error) {
        console.log(`User column ${column.split(' ')[0]} might already exist`);
      }
    }

    const bugColumns = [
      'supports_count INTEGER DEFAULT 0',
      'comments_count INTEGER DEFAULT 0',
      'shares_count INTEGER DEFAULT 0',
      'views_count INTEGER DEFAULT 0',
      'caption TEXT',
      'hashtags TEXT[]',
      'media_urls TEXT[]',
      'tagged_users INTEGER[]',
      'is_trending BOOLEAN DEFAULT FALSE',
      'viral_score INTEGER DEFAULT 0',
      'trending_rank INTEGER',
      'viral_peak_supports INTEGER DEFAULT 0',
      'viral_peak_date TIMESTAMP',
      'estimated_reward INTEGER DEFAULT 0',
      'social_multiplier DECIMAL(3,2) DEFAULT 1.0',
      'reported_location VARCHAR(255)',
      'user_agent TEXT',
      'screen_resolution VARCHAR(50)',
      'timezone VARCHAR(100)',
      'category VARCHAR(50) DEFAULT \'functional\'',
      'sub_category VARCHAR(50)',
      'impact_level VARCHAR(50) DEFAULT \'some-users\'',
      'frequency VARCHAR(50) DEFAULT \'sometimes\'',
      'environment VARCHAR(50) DEFAULT \'production\'',
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];

    for (const column of bugColumns) {
      try {
        await pool.query(`ALTER TABLE bugs ADD COLUMN IF NOT EXISTS ${column}`);
      } catch (error) {
        console.log(`Bug column ${column.split(' ')[0]} might already exist`);
      }
    }

    console.log('✅ Enhanced table columns added');

    -- Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_bugs_supports_count ON bugs(supports_count DESC);
      CREATE INDEX IF NOT EXISTS idx_bugs_trending ON bugs(is_trending, viral_score DESC);
      CREATE INDEX IF NOT EXISTS idx_bugs_category ON bugs(category);
      CREATE INDEX IF NOT EXISTS idx_bugs_submitted_at ON bugs(submitted_at DESC);
      CREATE INDEX IF NOT EXISTS idx_bug_supports_bug_id ON bug_supports(bug_id);
      CREATE INDEX IF NOT EXISTS idx_bug_supports_user_id ON bug_supports(user_id);
      CREATE INDEX IF NOT EXISTS idx_bug_comments_bug_id ON bug_comments(bug_id);
      CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
      CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_trending_bugs_date_rank ON trending_bugs(date, rank);
    `);
    console.log('✅ Performance indexes created');

    -- Create triggers for automatic updates
    await pool.query(`
      -- Function to update bug supports count
      CREATE OR REPLACE FUNCTION update_bug_supports_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE bugs SET supports_count = supports_count + 1 WHERE id = NEW.bug_id;
          UPDATE users SET total_supports_received = total_supports_received + 1 
          WHERE id = (SELECT user_id FROM bugs WHERE id = NEW.bug_id);
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE bugs SET supports_count = supports_count - 1 WHERE id = OLD.bug_id;
          UPDATE users SET total_supports_received = total_supports_received - 1 
          WHERE id = (SELECT user_id FROM bugs WHERE id = OLD.bug_id);
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger for bug supports
      DROP TRIGGER IF EXISTS bug_supports_count_trigger ON bug_supports;
      CREATE TRIGGER bug_supports_count_trigger
        AFTER INSERT OR DELETE ON bug_supports
        FOR EACH ROW EXECUTE FUNCTION update_bug_supports_count();
    `);

    await pool.query(`
      -- Function to update user followers count
      CREATE OR REPLACE FUNCTION update_followers_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
          UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
          UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
        END IF;
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger for user follows
      DROP TRIGGER IF EXISTS user_follows_count_trigger ON user_follows;
      CREATE TRIGGER user_follows_count_trigger
        AFTER INSERT OR DELETE ON user_follows
        FOR EACH ROW EXECUTE FUNCTION update_followers_count();
    `);
    console.log('✅ Database triggers created');

    -- Add existing admin user columns if they don't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP');
      console.log('✅ Email verification columns preserved');
    } catch (error) {
      console.log('ℹ️ User auth columns already exist');
    }

    -- Create default admin user (auto-verified) with social profile
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@bugbuzzers.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (name, email, password, is_admin, email_verified, username, bio, user_level) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'Admin User', 
          'admin@bugbuzzers.com', 
          hashedPassword, 
          true, 
          true, 
          'admin',
          'BugBuzzers Administrator - Keeping the platform safe and fun! 🛡️',
          'Platform Admin'
        ]
      );
      console.log('✅ Admin user created with social profile');
    } else {
      -- Update existing admin with social features
      await pool.query(`
        UPDATE users SET 
          email_verified = TRUE, 
          username = COALESCE(username, 'admin'),
          bio = COALESCE(bio, 'BugBuzzers Administrator - Keeping the platform safe and fun! 🛡️'),
          user_level = COALESCE(user_level, 'Platform Admin')
        WHERE email = $1
      `, ['admin@bugbuzzers.com']);
      console.log('✅ Admin user updated with social features');
    }

    -- Create sample trending categories for development
    await pool.query(`
      INSERT INTO trending_bugs (bug_id, date, rank, supports_count, viral_score, category)
      SELECT 'SAMPLE-001', CURRENT_DATE, 1, 1000, 2500, 'Social Media'
      WHERE NOT EXISTS (SELECT 1 FROM trending_bugs WHERE bug_id = 'SAMPLE-001')
    `);

    console.log('🎉 Database initialized successfully with social features!');
    console.log('🚀 Ready for social bug reporting revolution!');
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

// Social API Endpoints - Add these to your api/server.js after the existing routes

// ===================== SOCIAL API ROUTES =====================

// Support a bug (the main "I got this too" feature!)
app.post('/api/bugs/:id/support', authenticateToken, async (req, res) => {
  try {
    const { id: bugId } = req.params;
    const { supportType = 'experienced', deviceInfo = '', additionalContext = '' } = req.body;
    const userId = req.user.id;

    // Check if user already supported this bug
    const existingSupport = await pool.query(
      'SELECT id FROM bug_supports WHERE bug_id = $1 AND user_id = $2',
      [bugId, userId]
    );

    if (existingSupport.rows.length > 0) {
      return res.status(400).json({ error: 'You already support this bug' });
    }

    // Add support
    await pool.query(
      `INSERT INTO bug_supports (bug_id, user_id, support_type, device_info, additional_context)
       VALUES ($1, $2, $3, $4, $5)`,
      [bugId, userId, supportType, deviceInfo, additionalContext]
    );

    // Update viral score and check for trending
    await updateBugViralScore(bugId);

    // Create notification for bug reporter
    const bug = await pool.query('SELECT user_id, title FROM bugs WHERE id = $1', [bugId]);
    if (bug.rows.length > 0 && bug.rows[0].user_id !== userId) {
      await createNotification(
        bug.rows[0].user_id,
        'bug_supported',
        'Your bug got support!',
        `Someone also experienced "${bug.rows[0].title}"`,
        `/bugs/${bugId}`,
        { supporterUserId: userId, bugId }
      );
    }

    // Log user activity
    await logUserActivity(userId, 'bug_supported', `Supported a bug report`, bugId);

    res.json({ success: true, message: 'Bug supported successfully!' });
  } catch (error) {
    console.error('Support bug error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove support from a bug
app.delete('/api/bugs/:id/support', authenticateToken, async (req, res) => {
  try {
    const { id: bugId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM bug_supports WHERE bug_id = $1 AND user_id = $2 RETURNING id',
      [bugId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Support not found' });
    }

    // Update viral score
    await updateBugViralScore(bugId);

    res.json({ success: true, message: 'Support removed successfully!' });
  } catch (error) {
    console.error('Remove support error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get bug supporters
app.get('/api/bugs/:id/supporters', authenticateToken, async (req, res) => {
  try {
    const { id: bugId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await pool.query(`
      SELECT 
        bs.created_at,
        bs.support_type,
        bs.device_info,
        u.id,
        u.name,
        u.username,
        u.avatar_url,
        u.user_level
      FROM bug_supports bs
      JOIN users u ON bs.user_id = u.id
      WHERE bs.bug_id = $1
      ORDER BY bs.created_at DESC
      LIMIT $2 OFFSET $3
    `, [bugId, limit, offset]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get supporters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get social feed (Instagram-style bug feed)
app.get('/api/feed', authenticateToken, async (req, res) => {
  try {
    const { 
      filter = 'trending', // trending, recent, following, category
      category = null,
      limit = 20, 
      offset = 0 
    } = req.query;
    
    let query = `
      SELECT 
        b.*,
        u.name as reporter_name,
        u.username as reporter_username,
        u.avatar_url as reporter_avatar,
        u.user_level as reporter_level,
        u.followers_count as reporter_followers,
        -- Check if current user supports this bug
        CASE WHEN bs.id IS NOT NULL THEN true ELSE false END as user_supports,
        -- Get recent supporters for preview
        COALESCE(supporter_preview.supporters, '[]'::json) as recent_supporters
      FROM bugs b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN bug_supports bs ON b.id = bs.bug_id AND bs.user_id = $1
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'name', su.name,
            'username', su.username,
            'avatar_url', su.avatar_url
          )
        ) as supporters
        FROM bug_supports bsp
        JOIN users su ON bsp.user_id = su.id
        WHERE bsp.bug_id = b.id
        ORDER BY bsp.created_at DESC
        LIMIT 3
      ) supporter_preview ON true
    `;

    let orderClause = '';
    let whereClause = 'WHERE b.status != \'Rejected\'';
    const queryParams = [req.user.id];

    if (category) {
      whereClause += ` AND b.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    switch (filter) {
      case 'trending':
        orderClause = 'ORDER BY b.viral_score DESC, b.supports_count DESC, b.submitted_at DESC';
        break;
      case 'recent':
        orderClause = 'ORDER BY b.submitted_at DESC';
        break;
      case 'following':
        whereClause += ` AND EXISTS (
          SELECT 1 FROM user_follows uf 
          WHERE uf.follower_id = $1 AND uf.following_id = b.user_id
        )`;
        orderClause = 'ORDER BY b.submitted_at DESC';
        break;
      case 'most_supported':
        orderClause = 'ORDER BY b.supports_count DESC, b.submitted_at DESC';
        break;
      default:
        orderClause = 'ORDER BY b.viral_score DESC, b.submitted_at DESC';
    }

    query += ` ${whereClause} ${orderClause} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    // Calculate estimated rewards based on social validation
    const enhancedBugs = result.rows.map(bug => ({
      ...bug,
      estimated_reward: calculateSocialReward(bug.supports_count, bug.severity, bug.viral_score),
      time_ago: getTimeAgo(bug.submitted_at),
      hashtags: bug.hashtags || [],
      media_urls: bug.media_urls || [],
      recent_supporters: bug.recent_supporters || []
    }));

    res.json(enhancedBugs);
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get trending bugs
app.get('/api/trending', authenticateToken, async (req, res) => {
  try {
    const { category = null, timeframe = 'today' } = req.query;
    
    let dateFilter = '';
    switch (timeframe) {
      case 'today':
        dateFilter = "AND b.submitted_at >= CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "AND b.submitted_at >= CURRENT_DATE - INTERVAL '7 days'";
        break;
      case 'month':
        dateFilter = "AND b.submitted_at >= CURRENT_DATE - INTERVAL '30 days'";
        break;
    }

    let categoryFilter = '';
    let queryParams = [req.user.id];
    if (category) {
      categoryFilter = `AND b.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    const result = await pool.query(`
      SELECT 
        b.*,
        u.name as reporter_name,
        u.username as reporter_username,
        u.avatar_url as reporter_avatar,
        u.user_level as reporter_level,
        CASE WHEN bs.id IS NOT NULL THEN true ELSE false END as user_supports
      FROM bugs b
      JOIN users u ON b.user_id = u.id
      LEFT JOIN bug_supports bs ON b.id = bs.bug_id AND bs.user_id = $1
      WHERE b.supports_count > 0 
        ${dateFilter}
        ${categoryFilter}
      ORDER BY b.viral_score DESC, b.supports_count DESC
      LIMIT 20
    `, queryParams);

    res.json(result.rows.map(bug => ({
      ...bug,
      estimated_reward: calculateSocialReward(bug.supports_count, bug.severity, bug.viral_score),
      time_ago: getTimeAgo(bug.submitted_at)
    })));
  } catch (error) {
    console.error('Get trending bugs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow/Unfollow user
app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id: followingId } = req.params;
    const followerId = req.user.id;

    if (followerId == followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existingFollow = await pool.query(
      'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );

    if (existingFollow.rows.length > 0) {
      // Unfollow
      await pool.query(
        'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      );
      
      res.json({ following: false, message: 'Unfollowed successfully' });
    } else {
      // Follow
      await pool.query(
        'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
        [followerId, followingId]
      );

      // Create notification
      const follower = await pool.query('SELECT name, username FROM users WHERE id = $1', [followerId]);
      if (follower.rows.length > 0) {
        await createNotification(
          followingId,
          'new_follower',
          'New Follower!',
          `${follower.rows[0].name} (@${follower.rows[0].username}) started following you`,
          `/profile/${follower.rows[0].username}`,
          { followerId }
        );
      }

      res.json({ following: true, message: 'Following successfully' });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to bug
// Replace the incomplete comment endpoint (starting around line 1056) with:
app.post('/api/bugs/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id: bugId } = req.params;
    const { comment, parentId = null } = req.body;
    const userId = req.user.id;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const result = await pool.query(`
      INSERT INTO bug_comments (bug_id, user_id, parent_id, comment, is_admin)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [bugId, userId, parentId, comment.trim(), req.user.isAdmin]);

    // Update comments count
    await pool.query('UPDATE bugs SET comments_count = comments_count + 1 WHERE id = $1', [bugId]);

    // Create notification for bug reporter
    const bug = await pool.query('SELECT user_id, title FROM bugs WHERE id = $1', [bugId]);
    if (bug.rows.length > 0 && bug.rows[0].user_id !== userId) {
      await createNotification(
        bug.rows[0].user_id,
        'comment_added',
        'New Comment!',
        `Someone commented on "${bug.rows[0].title}"`,
        `/bugs/${bugId}`,
        { commenterId: userId, bugId }
      );
    }

    // Log user activity
    await logUserActivity(userId, 'comment_added', `Commented on a bug report`, bugId);

    res.json({ success: true, comment: result.rows[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add these helper functions BEFORE the "module.exports = app;" line:

// Helper function to update viral score
async function updateBugViralScore(bugId) {
  try {
    const result = await pool.query(`
      SELECT supports_count, comments_count, shares_count 
      FROM bugs WHERE id = $1
    `, [bugId]);
    
    if (result.rows.length > 0) {
      const bug = result.rows[0];
      const viralScore = (bug.supports_count * 10) + 
                        (bug.comments_count * 5) + 
                        (bug.shares_count * 3);
      
      await pool.query(
        'UPDATE bugs SET viral_score = $1, is_trending = $2 WHERE id = $3',
        [viralScore, viralScore > 500, bugId]
      );
    }
  } catch (error) {
    console.error('Update viral score error:', error);
  }
}

// Helper function to create notification
async function createNotification(userId, type, title, message, actionUrl, metadata = {}) {
  try {
    await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, type, title, message, actionUrl, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

// Helper function to log user activity
async function logUserActivity(userId, activityType, description, relatedBugId = null) {
  try {
    await pool.query(`
      INSERT INTO user_activities (user_id, activity_type, description, related_bug_id)
      VALUES ($1, $2, $3, $4)
    `, [userId, activityType, description, relatedBugId]);
  } catch (error) {
    console.error('Log activity error:', error);
  }
}

// Helper function to calculate social reward
function calculateSocialReward(supportsCount, severity, viralScore = 0) {
  const basePoints = { high: 500, medium: 300, low: 150 };
  const base = basePoints[severity] || 150;
  const supportMultiplier = Math.min(1 + (supportsCount * 0.1), 10);
  const viralBonus = viralScore > 1000 ? 2 : viralScore > 500 ? 1.5 : 1;
  return Math.round(base * supportMultiplier * viralBonus);
}

// Helper function for time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return `${Math.floor(diffInSeconds / 604800)}w ago`;
}

module.exports = app;
