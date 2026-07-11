// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const { createAdminIfNotExists } = require('./models');
const { openDb } = require('./db');

const app = express();

// ⚡ Trust proxy pour Render (nécessaire pour l'IP derrière le proxy)
app.set('trust proxy', true);

// CORS restreint en production
const allowedOrigins = [
  'https://rapfi-26-platforme.vercel.app',
  'https://rapfi-26-platforme-git-main-randrianjatovoh-cell.vercel.app',
  'http://localhost:3000'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ---------- Rate Limiting ----------
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 5 minutes.' },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

if (process.env.NODE_ENV === 'production') {
  const maxGlobal = parseInt(process.env.RATE_LIMIT_MAX) || 200;
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxGlobal,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes effectuées. Veuillez réessayer dans 15 minutes.' },
    validate: {
      trustProxy: false,
      xForwardedForHeader: false,
    },
  });

  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return globalLimiter(req, res, next);
    }
    next();
  });
  console.log(`🔒 Rate Limiting activé : ${maxGlobal} requêtes / 15 min pour les modifications`);
} else {
  console.log('⚠️ Rate Limiting global désactivé en développement.');
}

// ---------- Middlewares ----------
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// 🔥 ROUTE DE SANTÉ OPTIMISÉE - Moins de logs en production
// ============================================================
app.get('/healthz', (req, res) => {
  // Ne log pas les health checks en production pour réduire les logs
  if (process.env.NODE_ENV !== 'production') {
    console.log('📥 GET /healthz');
  }
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.json({ message: 'Backend is alive' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend OK' });
});

// ---------- Middleware pour logger les requêtes (filtré en prod) ----------
app.use((req, res, next) => {
  // Filtrer les health checks en production
  if (req.path === '/healthz' && process.env.NODE_ENV === 'production') {
    return next();
  }
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ✅ FORCER LA CRÉATION DE LA TABLE VOLA_SISA_TEO_ALOHA
// ============================================================
async function ensureVolaSisaTable() {
  try {
    const db = await openDb();
    console.log('📝 Vérification de la table vola_sisa_teo_aloha...');
    
    // Vérifier si la table existe
    let tableExists = false;
    try {
      await db.get('SELECT 1 FROM vola_sisa_teo_aloha LIMIT 1');
      tableExists = true;
      console.log('ℹ️ La table vola_sisa_teo_aloha existe déjà');
    } catch (err) {
      tableExists = false;
      console.log('📝 La table vola_sisa_teo_aloha n\'existe pas, création en cours...');
    }
    
    if (!tableExists) {
      if (db.isPostgres) {
        await db.run(`
          CREATE TABLE IF NOT EXISTS vola_sisa_teo_aloha (
            id SERIAL PRIMARY KEY,
            month_id VARCHAR(10) NOT NULL,
            eglise VARCHAR(255) NOT NULL,
            amount INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(month_id, eglise)
          )
        `);
        await db.run(`
          CREATE INDEX IF NOT EXISTS idx_vola_sisa_month_eglise 
          ON vola_sisa_teo_aloha(month_id, eglise)
        `);
      } else {
        await db.run(`
          CREATE TABLE IF NOT EXISTS vola_sisa_teo_aloha (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month_id VARCHAR(10) NOT NULL,
            eglise VARCHAR(255) NOT NULL,
            amount INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(month_id, eglise)
          )
        `);
        await db.run(`
          CREATE INDEX IF NOT EXISTS idx_vola_sisa_month_eglise 
          ON vola_sisa_teo_aloha(month_id, eglise)
        `);
      }
      console.log('✅ Table vola_sisa_teo_aloha créée avec succès');
    }
  } catch (err) {
    console.error('❌ Erreur lors de la vérification/création de la table vola_sisa_teo_aloha:', err);
  }
}

// ---------- Routes API ----------
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
    // Initialiser la base de données
    const db = await initDb();
    
    // Créer l'admin si nécessaire
    await createAdminIfNotExists();
    
    // 🔥 FORCER LA CRÉATION DE LA TABLE VOLA_SISA_TEO_ALOHA
    await ensureVolaSisaTable();
    
    const port = process.env.PORT || 5000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Backend démarré sur le port ${port}`);
      console.log(`   Environnement : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   CORS autorise : ${allowedOrigins.join(', ')}`);
    });
  } catch (err) {
    console.error('❌ Erreur au démarrage :', err);
    process.exit(1);
  }
};

start();