const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Student, Mark, Fee } = require('../models');

const router = express.Router();

router.use(auth, authorize('Teacher', 'Principal', 'President', 'Accountant', 'Secretary'));

// ✅ ALL fields now included — nothing dropped
function normalizeStudentPayload(body) {
  return {
    admissionNo:        body.admissionNo,           // ✅ ADDED — was missing
    studentId:          body.studentId,
    reg:                body.reg,
    name:               body.name,
    class:              body.class,
    section:            body.section,
    motherTongue:       body.motherTongue,
    dob:                body.dob,
    placeOfBirth:       body.placeOfBirth,
    aadhaarStudent:     body.aadhaarStudent,
    bloodStudent:       body.bloodStudent,
    motherAadhaar:      body.motherAadhaar,         // ✅ ADDED — was missing
    fatherAadhaar:      body.fatherAadhaar,         // ✅ ADDED — was missing
    nationality:        body.nationality,           // ✅ ADDED — was missing
    religionCaste:      body.religionCaste,         // ✅ ADDED — was missing
    pname:              body.pname,
    parentMob:          body.parentMob,
    occupation:         body.occupation,
    isRailwayEmployee:  body.isRailwayEmployee,
    addr:               body.addr,
    guardianName:       body.guardianName,
    guardianOccupation: body.guardianOccupation,
    guardianAddress:    body.guardianAddress,
    lastClass:          body.lastClass,
    prevSchool:         body.prevSchool,
    tcDate:             body.tcDate || null,
    medium:             body.medium,
    lang1:              body.lang1,
    lang2:              body.lang2,
    mark1:              body.mark1,
    mark2:              body.mark2,
    penNumber:          body.penNumber,
    rem:                body.rem,
    jDate:              body.jDate
  };
}

router.get('/', async (req, res) => {
  try {
    const students = await Student.findAll({ order: [['admissionNo', 'DESC']] });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch students' });
  }
});

router.post('/', async (req, res) => {
  const payload = normalizeStudentPayload(req.body);

  if (!payload.admissionNo || !payload.studentId || !payload.reg ||
      !payload.name || !payload.class || !payload.section ||
      !payload.dob || !payload.pname || !payload.parentMob || !payload.jDate) {
    return res.status(400).json({ message: 'Missing required student fields' });
  }

  try {
    // Duplicate check 1: Admission No must be unique school-wide
    const existsByAdm = await Student.findOne({ where: { admissionNo: payload.admissionNo } });
    if (existsByAdm) {
      return res.status(409).json({ message: `Admission No "${payload.admissionNo}" already exists` });
    }

    // Duplicate check 2: Roll No only needs to be unique within the same class
    // (studentId/ADM NO is intentionally NOT checked for global uniqueness anymore —
    // it repeats across classes, e.g. roll 1 in Class 1 and roll 1 in Class 5)
    const rollExists = await Student.findOne({
      where: {
        reg: payload.reg,
        class: payload.class
      }
    });
    if (rollExists) {
      return res.status(409).json({ message: `Roll No "${payload.reg}" already exists in Class ${payload.class}` });
    }

    const student = await Student.create(payload);
    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: error.message || 'Failed to create student' });
  }
});

router.put('/:studentId', async (req, res) => {
  const payload = normalizeStudentPayload(req.body);

  try {
    const student = await Student.findOne({ where: { studentId: req.params.studentId } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await student.update(payload);
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update student' });
  }
});

router.delete('/:studentId', async (req, res) => {
  try {
    const student = await Student.findOne({ where: { studentId: req.params.studentId } });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Mark.destroy({ where: { studentReg: req.params.studentId } });
    await Fee.destroy({ where: { studentReg: req.params.studentId } });
    await student.destroy();

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete student' });
  }
});

module.exports = router;
