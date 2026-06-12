const express = require('express');
const { getChurchConfig, saveChurchConfig } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  const config = await getChurchConfig(req.user.id);
  res.json(config || { district: "ANTSAHATANTERAKA", church: "", code: "" });
});

router.post('/', async (req, res) => {
  await saveChurchConfig(req.user.id, req.body);
  res.json({ success: true });
});

module.exports = router;