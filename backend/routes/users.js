// backend/routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { updateUser, getUserById, deleteUser, getAllUsers } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../services/upload');

const router = express.Router();

// GET /api/users – accessible à tout utilisateur authentifié
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allUsers = await getAllUsers();
    // ✅ Renvoyer plain_password pour l'affichage dans le tableau
    const sanitized = allUsers.map(u => ({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      eglise: u.eglise,
      district: u.district,
      federation: u.federation,
      fonction: u.fonction,
      photo: u.photo,
      adresse: u.adresse,
      contact: u.contact,
      plain_password: u.plain_password
    }));
    res.json(sanitized);
  } catch (err) {
    console.error('❌ Erreur GET /api/users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toutes les routes suivantes nécessitent une authentification
router.use(authenticateToken);

// Modifier un utilisateur (PUT et PATCH)
router.route('/:id')
  .put(async (req, res) => {
    try {
      const { id } = req.params;
      let updates = req.body;
      delete updates.id;
      delete updates.created_at;
      
      // Si un mot de passe est fourni, le hacher et garder plain_password
      if (updates.password) {
        const plain = updates.password;
        updates.plain_password = plain;
        updates.password = await bcrypt.hash(plain, 10);
      } else {
        delete updates.password;
      }
      
      await updateUser(id, updates);
      res.json({ success: true, message: 'Utilisateur mis à jour avec succès' });
    } catch (err) {
      console.error('❌ Erreur PUT /api/users/:id:', err);
      res.status(500).json({ error: err.message });
    }
  })
  .patch(async (req, res) => {
    try {
      const { id } = req.params;
      let updates = req.body;
      delete updates.id;
      delete updates.created_at;
      
      if (updates.password) {
        const plain = updates.password;
        updates.plain_password = plain;
        updates.password = await bcrypt.hash(plain, 10);
      } else {
        delete updates.password;
      }
      
      await updateUser(id, updates);
      res.json({ success: true, message: 'Utilisateur mis à jour avec succès' });
    } catch (err) {
      console.error('❌ Erreur PATCH /api/users/:id:', err);
      res.status(500).json({ error: err.message });
    }
  });

// Uploader une photo avec Cloudinary
router.post('/:id/photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Vérification des droits
    if (parseInt(id) !== user.id && user.fonction !== 'Admin') {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune photo envoyée' });
    }

    // Upload vers Cloudinary
    const photoUrl = await uploadToCloudinary(req.file.buffer, 'profiles');

    // Mettre à jour l'utilisateur
    await updateUser(id, { photo: photoUrl });

    res.json({ success: true, photoUrl, message: 'Photo mise à jour avec succès' });
  } catch (err) {
    console.error('❌ Erreur upload photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modifier le mot de passe
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
    }
    
    const hashed = await bcrypt.hash(password, 10);
    await updateUser(id, {
      password: hashed,
      plain_password: password
    });
    res.json({ success: true, message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('❌ Erreur PUT /api/users/:id/password:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (user && user.email === 'plateformerapfi@gmail.com') {
      return res.status(403).json({ error: "Impossible de supprimer l'administrateur principal" });
    }
    await deleteUser(id);
    res.json({ success: true, message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;