const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Student, Mark, Fee, Attendance } = require('../models');

// This ensures only a logged-in Student can access these specific routes
router.use(auth, authorize('Student'));

// 1. Get My Profile
router.get('/my-profile', async (req, res) => {
  try {
    const student = await Student.findByPk(req.user.id);
    if (!student) return res.status(404).json({ message: 'Profile not found.' });
    res.json(student);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 2. Get My Marks
router.get('/my-marks', async (req, res) => {
  try {
    const marks = await Mark.findAll({ where: { studentReg: req.user.id } });
    // We calculate percentage for the dashboard display
    const enriched = marks.map(m => {
        const total = m.total || 0;
        const max = 500; // Adjust this if your school max marks are different
        return { ...m.toJSON(), percentage: parseFloat(((total/max)*100).toFixed(1)) };
    });
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 3. Get My Attendance
router.get('/my-attendance', async (req, res) => {
  try {
    // Note: We use studentId (Roll No) because that's how attendance is recorded
    const att = await Attendance.findAll({ where: { studentId: req.user.studentId } });
    res.json(att);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 4. Get My Fees
// 4. Get My Fees
router.get('/my-fees', async (req, res) => {
  try {
    // We change 'reg' to 'studentReg' to match your database column
    const fees = await Fee.findAll({ 
      where: { studentReg: req.user.id } 
    });
    res.json(fees);
  } catch (e) { 
    console.error("Fee Fetch Error:", e);
    res.status(500).json({ message: e.message }); 
  }
});

module.exports = router;