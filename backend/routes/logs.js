const express = require('express');
const router = express.Router();
const { openDb } = require('../db');
const { authenticateToken, authorize } = require('../middleware/auth');

// POST /api/logs – enregistrer une connexion (authentifié)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId, userName, userFonction } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId requis' });
    }
    const db = await openDb();
    const date = new Date().toISOString();
    await db.run(
      'INSERT INTO user_logs (user_id, userName, userFonction, date) VALUES (?, ?, ?, ?)',
      [userId, userName || 'Inconnu', userFonction || '', date]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erreur insertion log:', err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du log' });
  }
});

// GET /api/logs – tous les logs (admin uniquement)
router.get('/', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const { limit = 10000, offset = 0 } = req.query;
    const db = await openDb();
    const logs = await db.all(
      'SELECT * FROM user_logs ORDER BY date DESC LIMIT ? OFFSET ?',
      [Number(limit), Number(offset)]
    );
    res.json(logs);
  } catch (err) {
    console.error('Erreur récupération logs:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

// GET /api/logs/unique – nombre d'utilisateurs distincts
router.get('/unique', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const db = await openDb();
    const row = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM user_logs');
    res.json({ count: row.count || 0 });
  } catch (err) {
    console.error('Erreur comptage unique:', err);
    res.status(500).json({ error: 'Erreur lors du comptage des utilisateurs uniques' });
  }
});

// GET /api/logs/visits – nombre de visites par utilisateur
router.get('/visits', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const db = await openDb();
    const visits = await db.all(
      'SELECT user_id, userName, COUNT(*) as count FROM user_logs GROUP BY user_id, userName ORDER BY count DESC'
    );
    res.json(visits);
  } catch (err) {
    console.error('Erreur regroupement visites:', err);
    res.status(500).json({ error: 'Erreur lors du regroupement des visites' });
  }
});

module.exports = router;