// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const { createAdminIfNotExists } = require('./models');

const app = express();

// ---------- CORS ----------
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ---------- Rate Limiting ----------
// Limiteur pour les routes sensibles (authentification) – actif partout
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 tentatives
  message: { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 5 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 🔥 En développement, on désactive complètement le rate limiter global
// En production, on applique des limites avec exemptions pour les GET de lecture
if (process.env.NODE_ENV === 'production') {
  const maxGlobal = parseInt(process.env.RATE_LIMIT_MAX) || 200;
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxGlobal,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes effectuées. Veuillez réessayer dans 15 minutes.' }
  });

  app.use('/api', (req, res, next) => {
    const exemptedPaths = [
      '/api/config',
      '/api/months',
      '/api/eglises',
      '/api/reports',
      '/api/frais',
      '/api/depenses',
      '/api/gl'
    ];
    if (req.method === 'GET' && exemptedPaths.some(p => req.path.startsWith(p))) {
      return next();
    }
    return globalLimiter(req, res, next);
  });
  console.log(`🔒 Rate Limiting activé : ${maxGlobal} requêtes / 15 min (GET lecture exemptées)`);
} else {
  console.log('⚠️ Rate Limiting global désactivé en développement (pour éviter les 429).');
}

// ---------- Middlewares ----------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les photos uploadées
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Routes ----------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/gl', require('./routes/gl'));
app.use('/api/depenses', require('./routes/depenses'));
app.use('/api/membres', require('./routes/membres'));
app.use('/api/months', require('./routes/months'));
app.use('/api/config', require('./routes/config'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/frais', require('./routes/frais'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/eglises', require('./routes/eglises'));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend OK' });
});

// ---------- Middleware de gestion d'erreurs ----------
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.stack || err);
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? (status === 500 ? 'Erreur interne du serveur' : err.message || 'Erreur')
    : err.message || 'Erreur interne du serveur';
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ---------- Démarrage ----------
const start = async () => {
  try {
    await initDb();
    await createAdminIfNotExists();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`✅ Backend démarré sur le port ${port}`);
      console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('❌ Erreur au démarrage :', err);
    process.exit(1);
  }
};

start();