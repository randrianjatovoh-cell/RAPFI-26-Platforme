const express = require('express');
const bcrypt = require('bcryptjs');
const { updateUser, getUserById } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  delete updates.id; // sécurité
  await updateUser(id, updates);
  res.json({ success: true });
});

router.put('/:id/photo', async (req, res) => {
  const { photo } = req.body;
  await updateUser(req.params.id, { photo });
  res.json({ success: true });
});

router.put('/:id/password', async (req, res) => {
  const { password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await updateUser(req.params.id, { password: hashed });
  res.json({ success: true });
});

module.exports = router;