const express = require('express');
const { addUserLog, getUserLogs, getUniqueVisitorsCount, getVisitsPerUser } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/', async (req, res) => {
  const { userId, userName, userFonction } = req.body;
  await addUserLog(userId, userName, userFonction);
  res.json({ success: true });
});

router.get('/', async (req, res) => {
  const logs = await getUserLogs();
  res.json(logs);
});

router.get('/unique', async (req, res) => {
  const count = await getUniqueVisitorsCount();
  res.json({ count });
});

router.get('/visits', async (req, res) => {
  const visits = await getVisitsPerUser();
  res.json(visits);
});

module.exports = router;