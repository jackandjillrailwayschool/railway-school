const express = require('express');
const router  = express.Router();
const db      = require('../models');
const auth    = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// Every route below requires a valid Student JWT
router.use(auth, authorize('Student'));

// ── GET /api/student-portal/my-profile ──────────────────────────
router.get('/my-profile', async (req, res) => {
  try {
    const student = await db.Student.findOne({
      where:      { admissionNo: req.user.id },
      attributes: { exclude: ['password'] }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/student-portal/my-marks ────────────────────────────
// Mark model links via studentReg = student.reg (string)
router.get('/my-marks', async (req, res) => {
  try {
    const student = await db.Student.findOne({ where: { admissionNo: req.user.id } });
    if (!student) return res.status(404).json({ message: 'Student not found.' });

    const marks = await db.Mark.findAll({
      where: { studentReg: student.reg },
      order: [['createdAt', 'DESC']]
    });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/student-portal/my-attendance ───────────────────────
// Attendance model links via admissionNo (integer)
router.get('/my-attendance', async (req, res) => {
  try {
    const attendance = await db.Attendance.findAll({
      where: { admissionNo: req.user.id },
      order: [['date', 'DESC']]
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/student-portal/my-fees ─────────────────────────────
// Fee model: studentReg = admissionNo (integer) — confirmed from model
router.get('/my-fees', async (req, res) => {
  try {
    const fees = await db.Fee.findAll({
      where: { studentReg: req.user.id },
      order: [['date', 'DESC']]
    });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;