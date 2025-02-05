const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/project');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path}`);
  console.log('[DEBUG] Request headers:', req.headers);
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request query:', req.query);
  if (req.method === 'POST') {
    console.log('[DEBUG] Request body:', req.body);
  }
  next();
});

// CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Database connection check
const prisma = require('./services/prisma');
prisma.$connect()
  .then(() => {
    console.log('Successfully connected to database');
    console.log('Available routes:');
    console.log('- POST /api/auth/register');
    console.log('- POST /api/auth/login');
    console.log('- GET /api/projects');
  })
  .catch(err => console.error('Failed to connect to database:', err));

// Routes
console.log('Mounting auth routes...');
app.use('/api/auth', authRoutes);
console.log('Mounting project routes...');
app.use('/api/projects', projectRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something broke!' });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not Found' });
});

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
