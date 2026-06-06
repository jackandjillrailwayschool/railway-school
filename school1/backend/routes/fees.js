const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const db = require('../models');

const router = express.Router();

router.use(auth, authorize('Accountant', 'Principal', 'President', 'Secretary'));

function calculateFeeStatus(total, paid) {
  const safeTotal = Number(total) || 0;
  const safePaid = Number(paid) || 0;

  if (safePaid >= safeTotal) return 'Paid';
  if (safePaid > 0) return 'Partial';
  return 'Unpaid';
}

router.get('/', async (req, res) => {
  try {
    const fees = await db.Fee.findAll({
     include: [{ model: db.Student, attributes: ['name', 'class', 'section', 'parentMob'] }],
      order: [['createdAt', 'DESC']]
    });

    res.json(fees.map((record) => ({
      id: record.id,
      reg: record.studentReg,
      total: Number(record.total),
      paid: Number(record.paid),
      pending: Number(record.pending),
      status: record.status,
      mode: record.mode,
      date: record.date,
      paymentTerm: record.paymentTerm,
      createdAt: record.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch fees' });
  }
});

router.post('/', async (req, res) => {
  const { reg, total, paid, mode, date, paymentTerm } = req.body;

  if (!reg || !total || !paid || !mode || !date || !paymentTerm) {
    return res.status(400).json({ message: 'Missing required fee fields' });
  }

  try {
    const existing = await db.Fee.findOne({ where: { studentReg: reg } });
    if (existing) {
      return res.status(409).json({ message: 'A fee record for this student already exists' });
    }

    const pending = Number(total) - Number(paid);
    const status = calculateFeeStatus(total, paid);

    const record = await db.Fee.create({
      studentReg: reg,
      total,
      paid,
      pending,
      status,
      mode,
      date,
      paymentTerm
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create fee record' });
  }
});

router.put('/:id', async (req, res) => {
  const { reg, total, paid, mode, date, paymentTerm } = req.body;

  try {
    const record = await db.Fee.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    const pending = Number(total) - Number(paid);
    const status = calculateFeeStatus(total, paid);

    await record.update({
      studentReg: reg,
      total,
      paid,
      pending,
      status,
      mode,
      date,
      paymentTerm
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update fee record' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await db.Fee.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Fee record not found' });
    }

    await record.destroy();
    res.json({ message: 'Fee record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to delete fee record' });
  }
});

module.exports = router;
