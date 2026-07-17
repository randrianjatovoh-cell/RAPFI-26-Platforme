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
// ✅ SAUVEGARDE GL - AVEC GESTION DES CONFLITS
// ============================================================
router.post('/save', checkAccess, async (req, res) => {
  try {
    const { month, data, eglise, district, federation } = req.body;
    const user = req.user;

    // Validation
    if (!eglise || eglise.trim() === '') {
      return res.status(400).json({ error: 'Le nom de l\'église est requis' });
    }

    if (!month) {
      return res.status(400).json({ error: 'Le mois est requis' });
    }

    const cleanEglise = eglise.trim();

    // VÉRIFICATION : L'église existe-t-elle ?
    const allUsers = await getAllUsers();
    const churchExists = allUsers.some(u => u.eglise === cleanEglise);
    
    // Si l'église n'existe pas et que c'est un Pasteur, on la crée
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

    // VÉRIFICATION : Les données existent-elles déjà ?
    let existingData = false;
    const sabbathIndices = Object.keys(data).filter(key => !isNaN(key));
    
    for (const sabbathIndex of sabbathIndices) {
      const exists = await hasGLDataForEglise(month, cleanEglise, parseInt(sabbathIndex));
      if (exists) {
        existingData = true;
        break;
      }
    }

    // Déterminer les paramètres finaux
    let finalEglise = cleanEglise;
    let finalDistrict = district;
    let finalFederation = federation;

    if (user.fonction !== 'Admin') {
      finalEglise = cleanEglise || user.eglise;
      finalDistrict = district || user.district;
      finalFederation = federation || user.federation;
    }

    // Vérification supplémentaire pour les non-admin
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

    // Sauvegarde
    await saveGLData({
      userId: user.id,
      month,
      data,
      eglise: finalEglise,
      district: finalDistrict,
      federation: finalFederation
    });
    
    // Recalcul du rapport mensuel
    await computeAndSaveMonthlyReports(month, finalEglise);
    
    // Message adapté à la situation
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
// ✅ LECTURE MOIS
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
// ✅ VÉRIFICATION DES DONNÉES EXISTANTES
// ============================================================
router.get('/check/:month/:eglise', async (req, res) => {
  try {
    const { month, eglise } = req.params;
    const user = req.user;
    
    // Vérifier les permissions
    if (user.fonction !== 'Admin' && user.fonction !== 'Pasteur') {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    
    const cleanEglise = eglise ? eglise.trim() : '';
    const exists = await hasGLDataForEglise(month, cleanEglise);
    res.json({ exists });
  } catch (err) {
    console.error('❌ Erreur /gl/check:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ✅ NOUVEAU : Récupération des données annuelles groupées
// ============================================================
router.get('/yearly/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const user = req.user;
    const { eglise, district, federation } = req.query;
    
    const cleanEglise = eglise ? eglise.trim() : null;
    const cleanDistrict = district ? district.trim() : null;
    const cleanFederation = federation ? federation.trim() : null;
    
    let result = {
      glData: {},
      depenses: {},
      frais: {},
      reports: {}
    };
    
    if (user.fonction === 'Admin') {
      result.glData = await getYearlyGLData(year, cleanEglise, cleanDistrict, cleanFederation);
      result.depenses = await getYearlyDepensesData(year, cleanEglise, cleanDistrict, cleanFederation);
      result.frais = await getYearlyFraisData(year, cleanEglise);
      result.reports = await getYearlyReportsData(year, cleanEglise);
    } else if (user.fonction === 'Vérificateur') {
      const fed = user.federation;
      result.glData = await getYearlyGLData(year, null, null, fed, 'federation');
      result.depenses = await getYearlyDepensesData(year, null, null, fed, 'federation');
      result.frais = await getYearlyFraisData(year, null, fed);
      result.reports = await getYearlyReportsData(year, null, fed);
    } else if (user.fonction === 'Pasteur') {
      if (cleanEglise) {
        result.glData = await getYearlyGLData(year, cleanEglise);
        result.depenses = await getYearlyDepensesData(year, cleanEglise);
        result.frais = await getYearlyFraisData(year, cleanEglise);
        result.reports = await getYearlyReportsData(year, cleanEglise);
      } else {
        const dist = user.district;
        result.glData = await getYearlyGLData(year, null, dist);
        result.depenses = await getYearlyDepensesData(year, null, dist);
        result.frais = await getYearlyFraisData(year, null, dist);
        result.reports = await getYearlyReportsData(year, null, dist);
      }
    } else {
      // Ancien/Trésorier
      const egl = user.eglise;
      result.glData = await getYearlyGLData(year, egl);
      result.depenses = await getYearlyDepensesData(year, egl);
      result.frais = await getYearlyFraisData(year, egl);
      result.reports = await getYearlyReportsData(year, egl);
    }
    
    res.json(result);
    
  } catch (err) {
    console.error('❌ Erreur /gl/yearly:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;