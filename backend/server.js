// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const { createAdminIfNotExists } = require('./models');

const app = express();

// --- Configuration CORS (corrigée) ---
// Lire l'origine autorisée depuis les variables d'environnement (Railway)
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

const corsOptions = {
    origin: allowedOrigin,
    credentials: true, // permet d'envoyer les cookies et headers d'authentification
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // répondre aux requêtes pré-vol OPTIONS
// ------------------------------------

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gl', require('./routes/gl'));
app.use('/api/depenses', require('./routes/depenses'));
app.use('/api/membres', require('./routes/membres'));
app.use('/api/months', require('./routes/months'));
app.use('/api/config', require('./routes/config'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/frais', require('./routes/frais'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/eglises', require('./routes/eglises'));

const start = async () => {
  await initDb();               // 1. Crée les tables et ajoute les colonnes
  await createAdminIfNotExists(); // 2. Crée l'admin après que la base soit prête
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`✅ Backend démarré sur le port ${port}`);
  });
};

start();