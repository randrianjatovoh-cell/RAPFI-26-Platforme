const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, createAdminIfNotExists, getAllUsers } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    const token = jwt.sign(
      { id: user.id, email: user.email, eglise: user.eglise, district: user.district, federation: user.federation, fonction: user.fonction },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, eglise: user.eglise, district: user.district, federation: user.federation, fonction: user.fonction }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, eglise, district, federation, responsable, email, password, fonction } = req.body;
    const existing = await getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });
    const hashed = await bcrypt.hash(password, 10);
    const id = await createUser({ nom, prenom, eglise, district, federation, responsable, email, password: hashed, fonction, niveau: 3 });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', authenticateToken, async (req, res) => {
  const users = await getAllUsers();
  res.json(users);
});

createAdminIfNotExists();

module.exports = router;