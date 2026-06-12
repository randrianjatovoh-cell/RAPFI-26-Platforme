const express = require('express');
const { saveDepenses, getDepenses } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/save', async (req, res) => {
  try {
    const { month, data } = req.body;
    await saveDepenses(req.user.id, month, data);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:month', async (req, res) => {
  try {
    const data = await getDepenses(req.user.id, req.params.month);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;