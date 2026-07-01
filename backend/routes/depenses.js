// backend/routes/depenses.js
const express = require('express');
const { 
  saveDepenses, 
  getDepensesByEglise, 
  getDepensesByDistrict, 
  getDepensesByFederation, 
  getDepensesForAdmin, 
  computeAndSaveMonthlyReports 
} = require('../models');
const { authenticateToken, checkAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.post('/save', checkAccess, async (req, res) => {
  try {
    const { month, data, eglise, district, federation } = req.body;
    const user = req.user;
    let finalEglise = eglise;
    let finalDistrict = district;
    let finalFederation = federation;
    if (user.fonction !== 'Admin') {
      finalEglise = user.eglise || '';
      finalDistrict = user.district || '';
      finalFederation = user.federation || '';
    }
    await saveDepenses({
      userId: user.id,
      month,
      data,
      eglise: finalEglise,
      district: finalDistrict,
      federation: finalFederation
    });
    await computeAndSaveMonthlyReports(month, finalEglise);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur /depenses/save:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const user = req.user;
    const { federation, district, eglise } = req.query;
    let data;
    if (user.fonction === 'Admin') {
      data = await getDepensesForAdmin(month, federation, district, eglise);
    } else if (user.fonction === 'Vérificateur') {
      data = await getDepensesByFederation(month, user.federation);
    } else if (user.fonction === 'Pasteur') {
      if (eglise) {
        data = await getDepensesByEglise(month, eglise);
      } else {
        data = await getDepensesByDistrict(month, user.district);
      }
    } else {
      data = await getDepensesByEglise(month, user.eglise);
    }
    res.json(data || []);
  } catch (err) {
    console.error('Erreur /depenses/:month:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;