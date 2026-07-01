// backend/routes/eglises.js
const express = require('express');
const { getAllUsers } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/district/:district', async (req, res) => {
  try {
    const users = await getAllUsers();
    const eglises = [...new Set(
      users
        .filter(u => u.district === req.params.district && u.eglise)
        .map(u => u.eglise)
    )];
    res.json(eglises);
  } catch (err) {
    console.error('Erreur récupération églises du district :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/federation/:federation', async (req, res) => {
  try {
    const users = await getAllUsers();
    const eglises = [...new Set(
      users
        .filter(u => u.federation === req.params.federation && u.eglise)
        .map(u => u.eglise)
    )];
    res.json(eglises);
  } catch (err) {
    console.error('Erreur récupération églises de la fédération :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;