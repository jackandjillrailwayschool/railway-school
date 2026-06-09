const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Student, Mark, Fee, Attendance } = require('../models');

// Only allow logged-in students
router.use(auth, authorize('Student'));

router.get('/my-profile', async (req, res) => {
  try { res.json(await Student.findByPk(req.user.id)); } 
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my-marks', async (req, res) => {
  try {
    const marks = await Mark.findAll({ where: { studentReg: req.user.id } });
    res.json(marks.map(m => ({ ...m.toJSON(), percentage: ((m.total/500)*100).toFixed(1), maxTotal: 500 })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my-attendance', async (req, res) => {
  try { res.json(await Attendance.findAll({ where: { studentId: req.user.studentId } })); } 
  catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/my-fees', async (req, res) => {
  try { res.json(await Fee.findAll({ where: { reg: req.user.id } })); } 
  catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;