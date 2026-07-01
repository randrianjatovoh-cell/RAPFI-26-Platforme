// backend/routes/months.js
const express = require('express');
const { getMonths, addMonth, deleteAllDataForMonth, getEgliseInfo } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const months = await getMonths();
    res.json(months);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const allowedRoles = ['Admin', 'Pasteur', 'Trésorier', 'Ancien'];
    if (!allowedRoles.includes(user.fonction)) {
      return res.status(403).json({ error: "Accès refusé : vous n'avez pas les droits pour ajouter un mois." });
    }
    const { id, name } = req.body;
    await addMonth(id, name);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:month/eglise/:eglise', async (req, res) => {
  try {
    const user = req.user;
    const { month, eglise } = req.params;

    let hasRight = false;

    if (user.fonction === 'Admin') {
      hasRight = true;
    } else if (user.fonction === 'Pasteur') {
      const egliseData = await getEgliseInfo(eglise);
      if (egliseData && egliseData.district === user.district) {
        hasRight = true;
      }
    } else if (user.fonction === 'Trésorier' || user.fonction === 'Ancien') {
      if (user.eglise === eglise) {
        hasRight = true;
      }
    }

    if (!hasRight) {
      return res.status(403).json({
        error: "Accès refusé : vous n'avez pas les droits pour supprimer les données de cette église."
      });
    }

    await deleteAllDataForMonth(month, eglise);
    res.json({
      success: true,
      message: `Données du mois ${month} pour l'église ${eglise} supprimées.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;