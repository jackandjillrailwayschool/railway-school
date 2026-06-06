const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const db = require('./models');
const remarkRoutes = require('./routes/remarks');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const markRoutes = require('./routes/marks');
const feeRoutes = require('./routes/fees');
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/remarks', remarkRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);

// --- FRONTEND INTEGRATION (ONE LINK SETUP) ---
// Serve all static files (CSS, JS, Images) from the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Main Route (Login/Index)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Fallback: This allows direct links to HTML files or React-style routing
app.get('*', (req, res) => {
  // If the request isn't an API call, send the index.html
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});
// ----------------------------------------------

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function seedDefaultUsers() {
  const users = [
    { email: 'president@school.com', password: 'president123', role: 'President', name: 'School President' },
    { email: 'principal@school.com', password: 'principal123', role: 'Principal', name: 'School Principal' },
    { email: 'teacher@school.com', password: 'teacher123', role: 'Teacher', name: 'Class Teacher' },
    { email: 'accountant@school.com', password: 'accountant123', role: 'Accountant', name: 'School Accountant' }
  ];

  for (const user of users) {
    try {
      const existing = await db.User.findOne({ where: { email: user.email } });
      if (!existing) {
        await db.User.create({
          email: user.email,
          passwordHash: bcrypt.hashSync(user.password, 10),
          role: user.role,
          name: user.name
        });
      }
    } catch (e) {
      console.log(`Note: User ${user.email} might already exist.`);
    }
  }
}

async function startServer() {
  try {
    // 1. Connect to TiDB Cloud
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    // 2. CREATE TABLES (I uncommented this line to fix the "Unknown Column" error)
    await db.sequelize.sync(); 
    console.log('Database tables verified and created.');

    // 3. Verify Default Users
    await seedDefaultUsers();
    console.log('Default users verified.');

    // 4. Start listening on the port provided by Render
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();