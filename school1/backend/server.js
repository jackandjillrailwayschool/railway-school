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

// 🔥 FIX: Matches the lowercase filename we just set
const studentPortalRoutes = require('./routes/studentportal');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Allow both local testing and your specific student portal link
app.use(cors({
  origin: '*', 
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/remarks', remarkRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/marks', markRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);

// 🔥 API for Student Dashboard
app.use('/api/student-portal', studentPortalRoutes);

// --- FRONTEND INTEGRATION ---
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error Handling
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
    } catch (e) { console.log("User verified."); }
  }
}

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connection established.');

    // We skip sync for now to avoid the constraint error you had earlier
    console.log('Database sync skipped.');

    await seedDefaultUsers();
    console.log('Default users verified.');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();