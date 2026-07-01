// backend/routes/frais.js
const express = require('express');
const { getFrais, setFrais, computeAndSaveMonthlyReports } = require('../models');
const { authenticateToken, checkAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Lecture – on vérifie l'accès en lecture sur l'église
router.get('/:month/:eglise', checkAccess, async (req, res) => {
  try {
    const frais = await getFrais(req.params.month, req.params.eglise);
    res.json(frais);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Écriture – on vérifie l'accès en écriture sur l'église
router.post('/', checkAccess, async (req, res) => {
  try {
    const { month, eglise, frais } = req.body;
    await setFrais(month, eglise, frais);
    await computeAndSaveMonthlyReports(month, eglise);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;