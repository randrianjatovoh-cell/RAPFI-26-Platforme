const express = require('express');
const { getMonthlyReport, updateReportField, upsertMonthlyReport, getGLEntries, getDepenses } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/monthly/:month/:eglise', async (req, res) => {
  const report = await getMonthlyReport(req.params.month, req.params.eglise);
  res.json(report || null);
});

router.put('/field', async (req, res) => {
  const { month, eglise, field, value } = req.body;
  await updateReportField(month, eglise, field, value);
  res.json({ success: true });
});

router.put('/sabbath-date', async (req, res) => {
  const { month, eglise, sabbathIndex, date } = req.body;
  let report = await getMonthlyReport(month, eglise);
  let sabbathDates = report ? JSON.parse(report.sabbath_dates || '["","","","",""]') : ["","","","",""];
  sabbathDates[sabbathIndex-1] = date;
  await upsertMonthlyReport(month, eglise, { sabbath_dates: JSON.stringify(sabbathDates) });
  res.json({ success: true });
});

router.get('/eglise/:eglise', async (req, res) => {
  const db = require('../db').openDb;
  const d = await db();
  const reports = await d.all('SELECT * FROM monthly_reports WHERE eglise = ? ORDER BY month_id', req.params.eglise);
  res.json(reports);
});

router.get('/district/:district', async (req, res) => {
  const db = require('../db').openDb;
  const d = await db();
  const reports = await d.all(`
    SELECT mr.* FROM monthly_reports mr
    JOIN users u ON u.eglise = mr.eglise
    WHERE u.district = ? ORDER BY mr.month_id
  `, req.params.district);
  res.json(reports);
});

router.get('/federation/:federation', async (req, res) => {
  const db = require('../db').openDb;
  const d = await db();
  const reports = await d.all(`
    SELECT mr.* FROM monthly_reports mr
    JOIN users u ON u.eglise = mr.eglise
    WHERE u.federation = ? ORDER BY mr.month_id
  `, req.params.federation);
  res.json(reports);
});

module.exports = router;