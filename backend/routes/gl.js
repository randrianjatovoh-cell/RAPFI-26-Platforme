// backend/routes/gl.js
const express = require('express');
const { 
  saveGLData, 
  getGLDataByEglise, 
  getGLDataByDistrict, 
  getGLDataByFederation, 
  getGLDataForAdmin, 
  computeAndSaveMonthlyReports,
  createEgliseIfNotExists,
  hasGLDataForEglise,
  getAllUsers
} = require('../models');
const { authenticateToken, checkAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ============================================================
// SAUVEGARDE GL
// ============================================================
router.post('/save', checkAccess, async (req, res) => {
  try {
    const { month, data, eglise, district, federation } = req.body;
    const user = req.user;

    if (!eglise || eglise.trim() === '') {
      return res.status(400).json({ error: 'Le nom de l\'église est requis' });
    }

    if (!month) {
      return res.status(400).json({ error: 'Le mois est requis' });
    }

    const cleanEglise = eglise.trim();

    // Vérifier si l'église existe
    const allUsers = await getAllUsers();
    const churchExists = allUsers.some(u => u.eglise === cleanEglise);
    
    if (!churchExists) {
      if (user.fonction === 'Pasteur') {
        console.log(`📝 Création de la nouvelle église: ${cleanEglise}`);
        await createEgliseIfNotExists(
          cleanEglise, 
          district || user.district, 
          federation || user.federation
        );
      } else {
        return res.status(404).json({ 
          error: 'Cette église n\'existe pas. Contactez votre Pasteur ou Administrateur.' 
        });
      }
    }

    // Vérifier si des données existent déjà
    let existingData = false;
    const sabbathIndices = Object.keys(data).filter(key => !isNaN(key));
    
    for (const sabbathIndex of sabbathIndices) {
      const exists = await hasGLDataForEglise(month, cleanEglise, parseInt(sabbathIndex));
      if (exists) {
        existingData = true;
        break;
      }
    }

    let finalEglise = cleanEglise;
    let finalDistrict = district;
    let finalFederation = federation;

    if (user.fonction !== 'Admin') {
      finalEglise = cleanEglise || user.eglise;
      finalDistrict = district || user.district;
      finalFederation = federation || user.federation;
    }

    if (user.fonction !== 'Admin' && 
        user.fonction !== 'Pasteur' && 
        user.fonction !== 'Vérificateur') {
      if (finalEglise !== user.eglise) {
        return res.status(403).json({ 
          error: 'Vous ne pouvez pas sauvegarder des données pour une autre église' 
        });
      }
    }

    console.log(`📝 Sauvegarde GL - Mois: ${month}, Église: ${finalEglise}`);

    await saveGLData({
      userId: user.id,
      month,
      data,
      eglise: finalEglise,
      district: finalDistrict,
      federation: finalFederation
    });
    
    await computeAndSaveMonthlyReports(month, finalEglise);
    
    const message = existingData 
      ? `Données mises à jour pour ${finalEglise}` 
      : `Données sauvegardées pour ${finalEglise}`;
    
    res.json({ 
      success: true, 
      message: message,
      eglise: finalEglise,
      month: month,
      updated: existingData
    });
    
  } catch (err) {
    console.error('❌ Erreur /gl/save:', err);
    if (err.message && err.message.includes('duplicate key')) {
      return res.status(409).json({ 
        error: 'Ces données existent déjà. La mise à jour a été effectuée.' 
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// LECTURE MOIS
// ============================================================
router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const user = req.user;
    const { federation, district, eglise } = req.query;
    
    const cleanEglise = eglise ? eglise.trim() : null;
    const cleanDistrict = district ? district.trim() : null;
    const cleanFederation = federation ? federation.trim() : null;
    
    let data = {};
    
    if (user.fonction === 'Admin') {
      data = await getGLDataForAdmin(month, cleanFederation, cleanDistrict, cleanEglise);
    } else if (user.fonction === 'Vérificateur') {
      data = await getGLDataByFederation(month, user.federation);
    } else if (user.fonction === 'Pasteur') {
      if (cleanEglise) {
        data = await getGLDataByEglise(month, cleanEglise);
      } else {
        data = await getGLDataByDistrict(month, user.district);
      }
    } else {
      data = await getGLDataByEglise(month, user.eglise);
    }
    
    res.json(data || {});
    
  } catch (err) {
    console.error('❌ Erreur /gl/:month:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// VÉRIFICATION DES DONNÉES EXISTANTES
// ============================================================
router.get('/check/:month/:eglise', async (req, res) => {
  try {
    const { month, eglise } = req.params;
    const user = req.user;
    
    if (user.fonction !== 'Admin' && user.fonction !== 'Pasteur') {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    
    const exists = await hasGLDataForEglise(month, eglise);
    res.json({ exists });
  } catch (err) {
    console.error('❌ Erreur /gl/check:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DONNÉES ANNUELLES
// ============================================================
router.get('/yearly/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const user = req.user;
    const { eglise, district, federation } = req.query;
    
    // Cette fonctionnalité nécessite des fonctions getYearly*Data
    // qui ne sont pas encore implémentées dans le modèle
    res.json({ 
      glData: {}, 
      depenses: {}, 
      frais: {}, 
      reports: {} 
    });
  } catch (err) {
    console.error('❌ Erreur /gl/yearly:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;