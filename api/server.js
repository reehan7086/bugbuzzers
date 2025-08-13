const path = require('path');
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
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
    
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        points INTEGER DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Users table ready');

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

    // Create default admin user
    const adminExists = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@bugbuzzers.com']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4)',
        ['Admin User', 'admin@bugbuzzers.com', hashedPassword, true]
      );
      console.log('✅ Admin user created');
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

// Routes
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
      { id: user.id, email: user.email, isAdmin: user.is_admin },
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
        isAdmin: user.is_admin
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
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, points, is_admin',
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, isAdmin: user.is_admin },
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
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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

// Serve React app for all other routes
app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Initialize database and start server
initDB().then(() => {
  app.listen(port, () => {
    console.log(`BugBuzzers API running on port ${port}`);
  });
});

module.exports = app;
