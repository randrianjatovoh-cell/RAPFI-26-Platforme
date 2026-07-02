// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByEmail, createUser, getAllUsers } = require('../models');
const { authenticateToken, authorize } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');

const router = express.Router();

// ---------- LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        eglise: user.eglise,
        district: user.district,
        federation: user.federation,
        fonction: user.fonction,
        nom: user.nom,
        prenom: user.prenom,
        photo: user.photo,
        niveau: user.niveau
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        eglise: user.eglise,
        district: user.district,
        federation: user.federation,
        fonction: user.fonction,
        photo: user.photo,
        niveau: user.niveau,
        adresse: user.adresse,
        contact: user.contact
      }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- REGISTER (Admin uniquement) ----------
router.post('/register', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const { nom, prenom, eglise, district, federation, responsable, email, password, fonction } = req.body;

    const existing = await getUserByEmail(email);
    if (existing) return res.status(400).json({ error: 'Email déjà utilisé' });

    const hashed = await bcrypt.hash(password, 10);

    const id = await createUser({
      nom,
      prenom: prenom || '',
      eglise: eglise || '',
      district: district || '',
      federation: federation || '',
      responsable: responsable || '',
      email,
      password: hashed,
      fonction: fonction || 'Ancien',
      niveau: 3,
      photo: '',
      adresse: '',
      contact: '',
      plain_password: password
    });

    // 🔥 Envoi de l'email avec logs détaillés
    let emailSent = false;
    let emailError = null;
    try {
      console.log(`📧 Tentative d'envoi d'email à ${email}...`);
      const result = await sendWelcomeEmail(email, nom, email, password);
      if (result.success) {
        emailSent = true;
        console.log(`✅ Email de bienvenue envoyé à ${email}`);
      } else {
        emailError = result.error;
        console.warn(`⚠️ Email non envoyé : ${emailError}`);
      }
    } catch (emailErr) {
      emailError = emailErr.message;
      console.error('❌ Erreur lors de l\'envoi de l\'email :', emailErr);
    }

    res.status(201).json({
      id,
      message: 'Utilisateur créé avec succès.',
      emailSent,
      emailError: emailError || undefined
    });
  } catch (err) {
    console.error('Erreur création utilisateur :', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- LISTE DES UTILISATEURS (Admin) ----------
router.get('/users', authenticateToken, authorize('Admin'), async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Erreur dans /auth/users :', err);
    res.status(500).json({ error: 'Erreur serveur lors du chargement des utilisateurs' });
  }
});

// ---------- INFOS UTILISATEUR CONNECTÉ ----------
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;