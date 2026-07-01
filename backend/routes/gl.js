const express = require('express');
const { 
  saveGLData, 
  getGLDataByEglise, 
  getGLDataByDistrict, 
  getGLDataByFederation, 
  getGLDataForAdmin, 
  computeAndSaveMonthlyReports,
  createEgliseIfNotExists
} = require('../models');
const { authenticateToken, checkAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Sauvegarde – on vérifie l'accès en écriture sur l'église
router.post('/save', checkAccess, async (req, res) => {
  try {
    const { month, data, eglise, district, federation } = req.body;
    const user = req.user;

    // Si l'église est nouvelle (flag posé par checkAccess) et que c'est un pasteur, on la crée
    if (req.newEglise && user.fonction === 'Pasteur') {
      await createEgliseIfNotExists(eglise, district || user.district, federation || user.federation);
    }

    // Déterminer les valeurs finales
    let finalEglise = eglise;
    let finalDistrict = district;
    let finalFederation = federation;

    if (user.fonction !== 'Admin') {
      finalEglise = eglise || user.eglise;
      finalDistrict = district || user.district;
      finalFederation = federation || user.federation;
    }

    await saveGLData({
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
    console.error('Erreur /gl/save:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lecture
router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const user = req.user;
    const { federation, district, eglise } = req.query;
    let data;
    if (user.fonction === 'Admin') {
      data = await getGLDataForAdmin(month, federation, district, eglise);
    } else if (user.fonction === 'Vérificateur') {
      data = await getGLDataByFederation(month, user.federation);
    } else if (user.fonction === 'Pasteur') {
      if (eglise) {
        data = await getGLDataByEglise(month, eglise);
      } else {
        data = await getGLDataByDistrict(month, user.district);
      }
    } else {
      data = await getGLDataByEglise(month, user.eglise);
    }
    res.json(data || {});
  } catch (err) {
    console.error('Erreur /gl/:month:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;