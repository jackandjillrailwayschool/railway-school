const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { Remark } = require('../models');

router.use(auth, authorize('Teacher', 'Principal', 'President'));

// GET /api/remarks?studentId=xx
router.get('/', async (req, res) => {
    const { studentId } = req.query;
    const where = studentId ? { studentId } : {};
    try {
        const rows = await Remark.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']] });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/remarks
router.post('/', async (req, res) => {
    const { studentId, admissionNo, remark, addedBy, role } = req.body;
    if (!studentId || !remark || !addedBy) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
    try {
        const row = await Remark.create({
            studentId,
            admissionNo,
            remark,
            addedBy,
            role,
            date: new Date().toISOString().split('T')[0]
        });
        res.json(row);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/remarks/:id
router.delete('/:id', async (req, res) => {
    try {
        await Remark.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;