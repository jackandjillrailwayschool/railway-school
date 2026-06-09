const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');

const router = express.Router();

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const allowedRoles = ['Teacher', 'Principal', 'President', 'Accountant', 'Secretary'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role selected.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    // Check if email already exists
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.User.create({ name, email, passwordHash, role });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Registration failed.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is registered as "${user.role}", not "${role}".` });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Login failed.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// Verifies email + role exist, then resets password.
// (No email service needed — direct reset for internal school system)
// ─────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email, role, newPassword, confirmPassword } = req.body;

  if (!email || !role || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const user = await db.User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

   if (user.role.toLowerCase() !== role.toLowerCase()) {
    return res.status(403).json({ message: `This account is registered as "${user.role}", not "${role}".` });
}

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await user.update({ passwordHash });

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Password reset failed.' });
  }
});


// ─────────────────────────────────────────────────────────────────
// POST /api/auth/student-login
// Student logs in with their admissionNo (integer) + password
// ─────────────────────────────────────────────────────────────────
router.post('/student-login', async (req, res) => {
  const { admissionNo, password } = req.body;

  if (!admissionNo || !password) {
    return res.status(400).json({ message: 'Admission Number and password are required.' });
  }

  try {
    const student = await db.Student.findOne({
      where: { admissionNo: parseInt(admissionNo, 10) }   // PK integer
    });

    if (!student) {
      return res.status(404).json({ message: 'No student found with this Admission Number.' });
    }

    if (!student.password) {
      return res.status(401).json({
        message: 'Password not set. Please contact your school admin.'
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid Admission Number or password.' });
    }

    const token = jwt.sign(
      {
        id:          student.admissionNo,   // INTEGER — used by all portal queries
        studentId:   student.studentId,
        role:        'Student',             // matches authorize('Student')
        name:        student.name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );

    res.json({
      token,
      student: {
        admissionNo: student.admissionNo,
        studentId:   student.studentId,
        name:        student.name,
        class:       student.class,
        section:     student.section,
        pname:       student.pname,
        dob:         student.dob
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message || 'Student login failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/auth/set-student-password
// Staff sets a student's password (by admissionNo)
// ─────────────────────────────────────────────────────────────────
router.post('/set-student-password', async (req, res) => {
  const { admissionNo, newPassword } = req.body;

  if (!admissionNo || !newPassword) {
    return res.status(400).json({ message: 'Admission Number and password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const student = await db.Student.findOne({ where: { admissionNo: parseInt(admissionNo) } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await student.update({ password: passwordHash });

    res.json({ message: `Password set successfully for ${student.name}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/student-login', async (req, res) => {
  const { admissionNo, password } = req.body;
  if (!admissionNo || !password)
    return res.status(400).json({ message: 'Admission Number and password are required.' });
  try {
    const student = await db.Student.findOne({ where: { admissionNo: parseInt(admissionNo) } });
    if (!student)
      return res.status(404).json({ message: 'No student found with this Admission Number.' });
    if (!student.password)
      return res.status(401).json({ message: 'Password not set. Contact school admin.' });
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid Admission Number or password.' });
    const token = jwt.sign(
      { id: student.admissionNo, studentId: student.studentId, role: 'Student', name: student.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    res.json({ token, student: {
      admissionNo: student.admissionNo, studentId: student.studentId,
      name: student.name, class: student.class, section: student.section,
      pname: student.pname, dob: student.dob
    }});
  } catch (err) { res.status(500).json({ message: err.message || 'Student login failed.' }); }
});

router.post('/set-student-password', async (req, res) => {
  const { admissionNo, newPassword } = req.body;
  if (!admissionNo || !newPassword)
    return res.status(400).json({ message: 'Admission Number and password are required.' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  try {
    const student = await db.Student.findOne({ where: { admissionNo: parseInt(admissionNo) } });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await student.update({ password: passwordHash });
    res.json({ message: `Password set successfully for ${student.name}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});
module.exports = router;