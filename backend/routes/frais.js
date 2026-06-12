const express = require('express');
const { getFrais, setFrais } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/:month/:eglise', async (req, res) => {
  const frais = await getFrais(req.params.month, req.params.eglise);
  res.json(frais);
});

router.post('/', async (req, res) => {
  const { month, eglise, frais } = req.body;
  await setFrais(month, eglise, frais);
  res.json({ success: true });
});

module.exports = router;