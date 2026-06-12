const express = require('express');
const { getMonths, addMonth } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const months = await getMonths();
  res.json(months);
});

router.post('/', async (req, res) => {
  const { id, name } = req.body;
  await addMonth(id, name);
  res.status(201).json({ success: true });
});

module.exports = router;