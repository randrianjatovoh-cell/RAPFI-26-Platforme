const express = require('express');
const { getAllUsers } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/district/:district', async (req, res) => {
  const users = await getAllUsers();
  const eglises = [...new Set(users.filter(u => u.district === req.params.district && u.eglise).map(u => u.eglise))];
  res.json(eglises);
});

router.get('/federation/:federation', async (req, res) => {
  const users = await getAllUsers();
  const eglises = [...new Set(users.filter(u => u.federation === req.params.federation && u.eglise).map(u => u.eglise))];
  res.json(eglises);
});

module.exports = router;