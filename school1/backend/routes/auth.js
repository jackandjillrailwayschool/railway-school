const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const router = express.Router();

// 1. Staff Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 2. Staff Registration
// 2. Staff Registration (Auto-Login version)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Account already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.User.create({ name, email, passwordHash, role });

    // Generate token so they don't have to log in manually after signup
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ 
        message: 'Account created!', 
        token, 
        user: { id: user.id, email: user.email, role: user.role, name: user.name } 
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

// 3. Student Login
router.post('/student-login', async (req, res) => {
  const { admissionNo, password } = req.body;
  try {
    const student = await db.Student.findOne({ where: { admissionNo: parseInt(admissionNo) } });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    if (!student.password) return res.status(401).json({ message: 'Password not set. Contact admin.' });

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password.' });

    const token = jwt.sign(
      { id: student.admissionNo, studentId: student.studentId, role: 'Student', name: student.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, student });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// 4. Set Student Password (Staff Side)
router.post('/set-student-password', async (req, res) => {
  const { admissionNo, newPassword } = req.body;
  try {
    const student = await db.Student.findOne({ where: { admissionNo: parseInt(admissionNo) } });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await student.update({ password: passwordHash });
    res.json({ message: `Password set successfully for ${student.name}.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;