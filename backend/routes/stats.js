const express = require('express');
const { getMembersStats } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/members', async (req, res) => {
  const stats = await getMembersStats();
  res.json(stats);
});

module.exports = router;