const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const db = require('../models');

const router = express.Router();

router.use(auth, authorize('Teacher', 'Principal', 'President', 'Secretary'));

// ── Grade calculation ──────────────────────────────────────────────────────
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 75) return 'A';
  if (percentage >= 60) return 'B';
  if (percentage >= 40) return 'C';
  return 'D';
}

const FA_EXAMS = ['FA1', 'FA2', 'FA3', 'FA4'];
const SA_EXAMS = ['SA1', 'SA2', 'SA3'];

// ── Subject counts by class ────────────────────────────────────────────────
function getSubjectCount(cls) {
  const c = parseInt(cls);
  if (c >= 1 && c <= 5)  return 7;   // Primary
  if (c >= 6 && c <= 8)  return 6;   // Secondary
  if (c >= 9 && c <= 10) return 7;   // 9–10
  return 8;
}

// ── Max marks per subject for validation ──────────────────────────────────
// NOTE: For SA2 secondary/910, the marks[] array holds only the SA portion
// (max 80). Internals (max 20) are validated separately.
// So this function returns the max for the marks[] values specifically.
function getMarksArrayMax(exam, cls) {
  const c = parseInt(cls);

  if (FA_EXAMS.includes(exam)) return 50;   // FA: always 50

  if (exam === 'SA1') {
    if (c >= 1 && c <= 5) return 100;       // Primary SA1 = 100
    return 80;                               // Secondary/910 SA1 = 80
  }

  if (exam === 'SA2') {
    if (c >= 1 && c <= 5) return 100;       // Primary SA2 = 100
    return 80;                               // Secondary/910 SA2 marks portion = 80 (internals separate)
  }

  if (exam === 'SA3') return 100;            // Primary SA3 = 100

  // Legacy
  if (exam === 'Annual')                              return 100;
  if (exam === 'Quarterly' || exam === 'Half-Yearly') return 80;
  return 50; // Unit Tests
}

// ── Max per subject for total calculation ─────────────────────────────────
function getMaxPerSubject(exam, cls) {
  const c = parseInt(cls);

  if (FA_EXAMS.includes(exam)) return 50;

  if (exam === 'SA1') {
    if (c >= 1 && c <= 5) return 100;
    return 80;
  }
  if (exam === 'SA2' || exam === 'SA3') return 100;  // SA2 total = 80+20 = 100

  if (exam === 'Annual')                              return 100;
  if (exam === 'Quarterly' || exam === 'Half-Yearly') return 80;
  return 50;
}

// ── GET all marks ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const marks = await db.Mark.findAll({
      include: [{ model: db.Student, attributes: ['name', 'reg'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(marks.map((record) => ({
      id:         record.id,
      reg:        record.studentReg,
      name:       record.name,
      class:      record.class,
      section:    record.section,
      exam:       record.exam,
      marks:      record.marks,
      internals:  record.internals,
      total:      record.total,
      maxTotal:   record.maxTotal,
      percentage: record.percentage,
      grade:      record.grade,
      createdAt:  record.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch marks' });
  }
});

// ── POST save marks ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { reg, name, exam, marks, internals, class: cls, section } = req.body;

  if (!reg || !exam || !Array.isArray(marks)) {
    return res.status(400).json({ message: 'Student, exam, and marks array are required.' });
  }

  const c         = parseInt(cls);
  const isPrimary = c >= 1 && c <= 5;
  const isFA      = FA_EXAMS.includes(exam);
  const isSA2     = exam === 'SA2';

  // ── Validate marks array ─────────────────────────────────────────────────
  const marksMax = getMarksArrayMax(exam, cls);

  if (marks.some((m) => typeof m !== 'number' || m < 0 || m > marksMax)) {
    return res.status(400).json({
      message: `Marks must be between 0 and ${marksMax} for ${exam} (Class ${cls}).`
    });
  }

  // ── Validate internals (SA2 secondary/910 only, max 20) ──────────────────
  if (isSA2 && !isPrimary && Array.isArray(internals)) {
    if (internals.some((m) => typeof m !== 'number' || m < 0 || m > 20)) {
      return res.status(400).json({ message: 'Internal marks must be between 0 and 20.' });
    }
  }

  // ── Compute totals ───────────────────────────────────────────────────────
  const maxPerSubject = getMaxPerSubject(exam, cls);
  let total, maxTotal;

  if (isPrimary) {
    // Primary: core total = first 5 subjects only
    total    = marks.slice(0, 5).reduce((s, m) => s + Number(m), 0);
    maxTotal = maxPerSubject * 5;

  } else if (isSA2 && Array.isArray(internals) && internals.length > 0) {
    // SA2 secondary/910: SA marks + internals
    const saSum  = marks.reduce((s, m) => s + Number(m), 0);
    const intSum = internals.reduce((s, m) => s + Number(m), 0);
    total    = saSum + intSum;
    maxTotal = 100 * marks.length;   // 100 per subject (80 SA + 20 internals)

  } else {
    // FA and SA1 secondary/910
    total    = marks.reduce((s, m) => s + Number(m), 0);
    maxTotal = maxPerSubject * marks.length;
  }

  const percentage = maxTotal > 0
    ? Number(((total / maxTotal) * 100).toFixed(1))
    : 0;
  const grade = calculateGrade(percentage);

  try {
    // ── Prevent duplicate ────────────────────────────────────────────────
    const existing = await db.Mark.findOne({ where: { studentReg: reg, exam } });
    if (existing) {
      return res.status(409).json({
        message: `Marks for this student and exam (${exam}) already exist.`
      });
    }

    const record = await db.Mark.create({
      studentReg: reg,
      name,
      class:      cls,
      section,
      exam,
      marks,
      internals:  (isSA2 && !isPrimary) ? (internals || []) : [],
      total,
      maxTotal,
      percentage,
      grade
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to save marks' });
  }
});

// ── DELETE a mark record ───────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const record = await db.Mark.findByPk(req.params.id);
    if (!record) return res.status(404).json({ message: 'Mark record not found.' });
    await record.destroy();
    res.json({ message: 'Mark record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete mark.' });
  }
});

module.exports = router;