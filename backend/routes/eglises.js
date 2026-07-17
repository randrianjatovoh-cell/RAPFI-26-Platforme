// backend/routes/eglises.js
const express = require('express');
const { getAllUsers, createEgliseIfNotExists, getEgliseInfo } = require('../models');
const { authenticateToken, checkAccess, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ============================================================
// RÉCUPÉRER LES ÉGLISES D'UN DISTRICT
// ============================================================
router.get('/district/:district', async (req, res) => {
  try {
    const users = await getAllUsers();
    const eglises = [...new Set(
      users
        .filter(u => u.district === req.params.district && u.eglise)
        .map(u => u.eglise)
    )];
    res.json(eglises);
  } catch (err) {
    console.error('Erreur récupération églises du district :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// RÉCUPÉRER LES ÉGLISES D'UNE FÉDÉRATION
// ============================================================
router.get('/federation/:federation', async (req, res) => {
  try {
    const users = await getAllUsers();
    const eglises = [...new Set(
      users
        .filter(u => u.federation === req.params.federation && u.eglise)
        .map(u => u.eglise)
    )];
    res.json(eglises);
  } catch (err) {
    console.error('Erreur récupération églises de la fédération :', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// CRÉER UNE NOUVELLE ÉGLISE (Pasteur ou Admin)
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { eglise, district, federation } = req.body;
    const user = req.user;
    
    if (!eglise || eglise.trim() === '') {
      return res.status(400).json({ error: 'Le nom de l\'église est requis' });
    }
    
    if (user.fonction !== 'Admin' && user.fonction !== 'Pasteur') {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    
    if (user.fonction === 'Pasteur') {
      if (district && district !== user.district) {
        return res.status(403).json({ 
          error: 'Vous ne pouvez créer une église que dans votre district' 
        });
      }
    }
    
    const cleanEglise = eglise.trim();
    const finalDistrict = district || user.district;
    const finalFederation = federation || user.federation;
    
    const result = await createEgliseIfNotExists(
      cleanEglise, 
      finalDistrict, 
      finalFederation
    );
    
    res.json({
      success: true,
      message: `Église "${cleanEglise}" créée avec succès`,
      eglise: cleanEglise,
      email: result.email,
      plainPassword: result.plainPassword
    });
    
  } catch (err) {
    console.error('❌ Erreur création église:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// RÉCUPÉRER LES INFOS D'UNE ÉGLISE
// ============================================================
router.get('/:eglise', async (req, res) => {
  try {
    const info = await getEgliseInfo(req.params.eglise);
    if (!info) {
      return res.status(404).json({ error: 'Église non trouvée' });
    }
    res.json(info);
  } catch (err) {
    console.error('Erreur récupération infos église :', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;