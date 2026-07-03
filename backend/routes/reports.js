// backend/routes/reports.js
const express = require('express');
const { 
  getMonthlyReport, 
  updateReportField, 
  upsertMonthlyReport, 
  getAllUsers,
  computeAndSaveMonthlyReports  // IMPORTANT : ajouté pour le rebuild
} = require('../models');
const { authenticateToken, checkAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Obtenir un rapport mensuel pour une église
router.get('/monthly/:month/:eglise', checkAccess, async (req, res) => {
  try {
    const report = await getMonthlyReport(req.params.month, req.params.eglise);
    res.json(report || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔥 Route pour forcer le recalcul d'un rapport mensuel (utilisé par le frontend)
router.post('/rebuild', checkAccess, async (req, res) => {
  try {
    const { month, eglise } = req.body;
    if (!month || !eglise) {
      return res.status(400).json({ error: 'Month and eglise are required' });
    }
    // Recalculer le rapport
    await computeAndSaveMonthlyReports(month, eglise);
    // Récupérer le rapport fraîchement créé
    const report = await getMonthlyReport(month, eglise);
    res.json(report);
  } catch (err) {
    console.error('Erreur lors du rebuild du rapport :', err);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un champ du rapport
router.put('/field', checkAccess, async (req, res) => {
  try {
    const { month, eglise, field, value } = req.body;
    await updateReportField(month, eglise, field, value);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour la date d'un sabbat
router.put('/sabbath-date', checkAccess, async (req, res) => {
  try {
    const { month, eglise, sabbathIndex, date } = req.body;
    let report = await getMonthlyReport(month, eglise);
    let sabbathDates = report ? JSON.parse(report.sabbath_dates || '["","","","",""]') : ["","","","",""];
    sabbathDates[sabbathIndex - 1] = date;
    await upsertMonthlyReport(month, eglise, { sabbath_dates: JSON.stringify(sabbathDates) });
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur sauvegarde date Sabbat:', err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer tous les rapports d'une église
router.get('/eglise/:eglise', checkAccess, async (req, res) => {
  try {
    const db = require('../db').openDb;
    const d = await db();
    const reports = await d.all('SELECT * FROM monthly_reports WHERE eglise = ? ORDER BY month_id', req.params.eglise);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les rapports d'un district – avec vérification que l'utilisateur a le droit
router.get('/district/:district', async (req, res) => {
  try {
    const user = req.user;
    const requestedDistrict = req.params.district;
    if (user.fonction === 'Admin') {
      // autorisé
    } else if (user.fonction === 'Pasteur') {
      if (user.district !== requestedDistrict) {
        return res.status(403).json({ error: 'Accès interdit à ce district' });
      }
    } else {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const db = require('../db').openDb;
    const d = await db();
    const reports = await d.all(`
      SELECT mr.* FROM monthly_reports mr
      JOIN users u ON u.eglise = mr.eglise
      WHERE u.district = ? ORDER BY mr.month_id
    `, requestedDistrict);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les rapports d'une fédération – avec vérification
router.get('/federation/:federation', async (req, res) => {
  try {
    const user = req.user;
    const requestedFederation = req.params.federation;
    const { year, month } = req.query;

    if (user.fonction === 'Admin') {
      // autorisé
    } else if (user.fonction === 'Vérificateur') {
      if (user.federation !== requestedFederation) {
        return res.status(403).json({ error: 'Accès interdit à cette fédération' });
      }
    } else {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const db = require('../db').openDb;
    const d = await db();
    let sql = `
      SELECT mr.* FROM monthly_reports mr
      JOIN users u ON u.eglise = mr.eglise
      WHERE u.federation = ?
    `;
    const params = [requestedFederation];
    if (year) {
      sql += ` AND mr.month_id LIKE ?`;
      params.push(`${year}%`);
    }
    if (month) {
      sql += ` AND mr.month_id = ?`;
      params.push(month);
    }
    sql += ` ORDER BY mr.month_id`;
    const reports = await d.all(sql, params);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;