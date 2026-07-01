const express = require('express');
const bcrypt = require('bcryptjs');
const { updateUser, getUserById, deleteUser } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Modifier un utilisateur (champs généraux)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let updates = req.body;
  delete updates.id;
  if (updates.password) {
    const plain = updates.password;
    updates.plain_password = plain;
    updates.password = await bcrypt.hash(plain, 10);
  }
  await updateUser(id, updates);
  res.json({ success: true });
});

// Modifier la photo
router.put('/:id/photo', async (req, res) => {
  const { photo } = req.body;
  await updateUser(req.params.id, { photo });
  res.json({ success: true });
});

// Modifier le mot de passe (spécifique)
router.put('/:id/password', async (req, res) => {
  const { password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await updateUser(req.params.id, { 
    password: hashed,
    plain_password: password
  });
  res.json({ success: true });
});

// Supprimer un utilisateur
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (user && user.email === 'admin@eglise.com') {
      return res.status(403).json({ error: "Impossible de supprimer l'administrateur principal" });
    }
    await deleteUser(id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;