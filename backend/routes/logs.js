// backend/routes/logs.js
const express = require('express');
const { addUserLog, getUserLogs, getLogsCount, getUniqueVisitorsCount, getVisitsPerUser } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { userId, userName, userFonction } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await addUserLog(userId, userName, userFonction, ip, userAgent);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur addUserLog :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const logs = await getUserLogs(limit, offset);
    const total = await getLogsCount();
    res.json({ logs, total });
  } catch (err) {
    console.error('❌ Erreur getUserLogs :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/unique', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const count = await getUniqueVisitorsCount();
    res.json({ count });
  } catch (err) {
    console.error('❌ Erreur getUniqueVisitorsCount :', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/visits', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const visits = await getVisitsPerUser();
    res.json(visits);
  } catch (err) {
    console.error('❌ Erreur getVisitsPerUser :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;