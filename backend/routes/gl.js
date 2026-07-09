// backend/routes/gl.js
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

// ============================================================
// ✅ SAUVEGARDE - CORRIGÉE
// ============================================================
router.post('/save', checkAccess, async (req, res) => {
  try {
    const { month, data, eglise, district, federation } = req.body;
    const user = req.user;

    // 🔥 Vérifier que l'église est spécifiée
    if (!eglise || eglise.trim() === '') {
      return res.status(400).json({ error: 'Le nom de l\'église est requis' });
    }

    // Nettoyer le nom de l'église
    const cleanEglise = eglise.trim();

    // Si l'église est nouvelle et que c'est un pasteur, on la crée
    if (req.newEglise && user.fonction === 'Pasteur') {
      await createEgliseIfNotExists(cleanEglise, district || user.district, federation || user.federation);
    }

    // 🔥 Déterminer les valeurs finales avec le nom nettoyé
    let finalEglise = cleanEglise;
    let finalDistrict = district;
    let finalFederation = federation;

    if (user.fonction !== 'Admin') {
      finalEglise = cleanEglise || user.eglise;
      finalDistrict = district || user.district;
      finalFederation = federation || user.federation;
    }

    // 🔥 Vérifier que l'église correspond bien à l'utilisateur (sauf Admin)
    if (user.fonction !== 'Admin' && user.fonction !== 'Pasteur' && user.fonction !== 'Vérificateur') {
      if (finalEglise !== user.eglise) {
        return res.status(403).json({ 
          error: 'Vous ne pouvez pas sauvegarder des données pour une autre église' 
        });
      }
    }

    console.log(`📝 Sauvegarde GL - Mois: ${month}, Église: ${finalEglise}, District: ${finalDistrict}`);

    await saveGLData({
      userId: user.id,
      month,
      data,
      eglise: finalEglise,
      district: finalDistrict,
      federation: finalFederation
    });
    
    await computeAndSaveMonthlyReports(month, finalEglise);
    
    res.json({ 
      success: true, 
      message: `Données sauvegardées pour ${finalEglise}`,
      eglise: finalEglise,
      month: month
    });
    
  } catch (err) {
    console.error('❌ Erreur /gl/save:', err);
    
    // 🔥 Gestion des erreurs spécifiques
    if (err.message && err.message.includes('duplicate key')) {
      return res.status(409).json({ 
        error: 'Ces données existent déjà. La mise à jour a été effectuée.' 
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// ✅ LECTURE - CORRIGÉE
// ============================================================
router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const user = req.user;
    const { federation, district, eglise } = req.query;
    
    // 🔥 Nettoyer les paramètres
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
      // Ancien/Trésorier - uniquement leur église
      data = await getGLDataByEglise(month, user.eglise);
    }
    
    res.json(data || {});
    
  } catch (err) {
    console.error('❌ Erreur /gl/:month:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;