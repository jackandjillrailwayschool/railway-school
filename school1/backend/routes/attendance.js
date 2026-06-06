const express = require('express');
const router = express.Router();
const { Attendance } = require('../models');
const { Op } = require('sequelize');

// POST /api/attendance — save full session
router.post('/', async (req, res) => {
    const { date, class: cls, section, session, records } = req.body;

    if (!date || !cls || !section || !session || !Array.isArray(records)) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        // Delete existing records for this session, then re-insert
        await Attendance.destroy({ where: { date, class: cls, section, session } });

        const rows = records.map(r => ({
            studentId:   r.studentId,
            admissionNo: r.admissionNo,
            name:        r.name,
            class:       cls,
            section,
            date,
            session,
            status:      r.status
        }));

        await Attendance.bulkCreate(rows);
        res.json({ success: true, saved: rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/attendance — query with filters
router.get('/', async (req, res) => {
    const { date, class: cls, section, session, studentId } = req.query;

    const where = {};
    if (date)      where.date      = date;
    if (cls)       where.class     = cls;
    if (section)   where.section   = section;
    if (session)   where.session   = session;
    if (studentId) where.studentId = studentId;

    try {
        const rows = await Attendance.findAll({
            where,
            order: [['date', 'DESC'], ['name', 'ASC']]
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;