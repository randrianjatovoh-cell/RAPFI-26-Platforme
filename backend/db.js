// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const isProduction = !!process.env.DATABASE_URL;
let pgPool = null;

function convertPlaceholders(sql, params) {
  if (!params || params.length === 0) return sql;
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function createPgWrapper(pool) {
  return {
    async run(sql, ...params) {
      if (params.length === 1 && Array.isArray(params[0])) params = params[0];
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql, params);
        const res = await client.query(convertedSql, params);
        let lastID = null;
        if (sql.trim().toUpperCase().startsWith('INSERT') && res.rowCount > 0) {
          try {
            const idRes = await client.query('SELECT lastval()');
            lastID = idRes.rows[0].lastval;
          } catch (err) {
            if (err.code !== '55000') throw err;
          }
        }
        return { lastID, changes: res.rowCount };
      } finally { client.release(); }
    },
    async get(sql, ...params) {
      if (params.length === 1 && Array.isArray(params[0])) params = params[0];
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql, params);
        const res = await client.query(convertedSql, params);
        return res.rows[0] || null;
      } finally { client.release(); }
    },
    async all(sql, ...params) {
      if (params.length === 1 && Array.isArray(params[0])) params = params[0];
      const client = await pool.connect();
      try {
        const convertedSql = convertPlaceholders(sql, params);
        const res = await client.query(convertedSql, params);
        return res.rows;
      } finally { client.release(); }
    },
    async exec(sql) {
      const client = await pool.connect();
      try {
        const statements = sql.split(';').filter(stmt => stmt.trim() !== '');
        for (const stmt of statements) await client.query(stmt);
      } finally { client.release(); }
    },
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally { client.release(); }
    },
    get isPostgres() { return true; }
  };
}

async function openDb() {
  if (isProduction) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
      });
      await pgPool.query('SELECT 1');
    }
    return createPgWrapper(pgPool);
  } else {
    return open({
      filename: path.join(dataDir, 'rapfi.db'),
      driver: sqlite3.Database
    });
  }
}

/**
 * Vérifie et ajoute une colonne si elle manque (générique)
 */
async function ensureColumn(db, tableName, columnName, columnType) {
  let columnExists = false;
  if (isProduction) {
    const result = await db.get(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      tableName, columnName.toLowerCase()
    );
    columnExists = !!result;
  } else {
    const tableInfo = await db.all(`PRAGMA table_info(${tableName})`);
    columnExists = tableInfo.some(col => col.name === columnName);
  }
  if (!columnExists) {
    console.log(`🔧 Ajout de la colonne ${columnName} dans ${tableName}...`);
    await db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    console.log(`✅ Colonne ${columnName} ajoutée.`);
  } else {
    console.log(`ℹ️ La colonne ${columnName} existe déjà.`);
  }
}

async function initDb() {
  const db = await openDb();

  const schemaSQL = isProduction ? `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nom TEXT,
      prenom TEXT,
      eglise TEXT,
      district TEXT,
      responsable TEXT,
      email TEXT UNIQUE,
      password TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      federation TEXT,
      fonction TEXT,
      niveau INTEGER,
      photo TEXT,
      adresse TEXT,
      contact TEXT,
      plain_password TEXT
    );
    CREATE TABLE IF NOT EXISTS gl_data (
      user_id INTEGER,
      month TEXT,
      data TEXT,
      eglise TEXT,
      district TEXT,
      federation TEXT,
      PRIMARY KEY (user_id, month)
    );
    CREATE TABLE IF NOT EXISTS depenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      month TEXT,
      data TEXT,
      eglise TEXT,
      district TEXT,
      federation TEXT
    );
    CREATE TABLE IF NOT EXISTS membres (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      nom TEXT,
      prenom TEXT,
      dateEntree TEXT,
      typeEntree TEXT,
      dateSortie TEXT,
      typeSortie TEXT,
      raisonSortie TEXT,
      actif INTEGER,
      sexe TEXT,
      age INTEGER
    );
    CREATE TABLE IF NOT EXISTS months (
      id TEXT PRIMARY KEY,
      name TEXT
    );
    CREATE TABLE IF NOT EXISTS church_config (
      user_id INTEGER PRIMARY KEY,
      district TEXT,
      church TEXT,
      code TEXT
    );
    CREATE TABLE IF NOT EXISTS monthly_reports (
      month_id TEXT,
      eglise TEXT,
      sabbath_dates TEXT,
      totalA INTEGER,
      totalB INTEGER,
      totalExpenses INTEGER,
      balanceChurch INTEGER,
      perSabbath TEXT,
      saramPandefasana INTEGER,
      dateVersementFME TEXT,
      rosiaNum TEXT,
      bokyBe TEXT,
      rapano TEXT,
      tatitra TEXT,
      dateFanamarihana TEXT,
      caisseFME TEXT,
      chequeRef TEXT,
      dateCheque TEXT,
      soraBolaDate TEXT,
      soraBolaMontant INTEGER,
      soraBolaLettres TEXT,
      soraBolaSignataire TEXT,
      soraBolaLinesJson TEXT,
      signatures TEXT,
      endOfYear TEXT,
      receiptNumber TEXT,
      note TEXT,
      volamPiangonanaApetraka INTEGER,
      PRIMARY KEY (month_id, eglise)
    );
    CREATE TABLE IF NOT EXISTS frais (
      month_id TEXT,
      eglise TEXT,
      amount INTEGER,
      PRIMARY KEY (month_id, eglise)
    );
    CREATE TABLE IF NOT EXISTS user_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      userName TEXT,
      userFonction TEXT,
      date TEXT NOT NULL,
      timestamp BIGINT,
      ip TEXT,
      userAgent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_logs_date ON user_logs(date);
    CREATE TABLE IF NOT EXISTS members_stats (
      memberName TEXT PRIMARY KEY,
      totalTithe INTEGER,
      participations INTEGER,
      lastMonth TEXT
    );
  ` : `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT, prenom TEXT, eglise TEXT, district TEXT,
      responsable TEXT, email TEXT UNIQUE, password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      federation TEXT,
      fonction TEXT,
      niveau INTEGER,
      photo TEXT,
      adresse TEXT,
      contact TEXT,
      plain_password TEXT
    );
    CREATE TABLE IF NOT EXISTS gl_data (user_id INTEGER, month TEXT, data TEXT, eglise TEXT, district TEXT, federation TEXT, PRIMARY KEY (user_id, month));
    CREATE TABLE IF NOT EXISTS depenses (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, month TEXT, data TEXT, eglise TEXT, district TEXT, federation TEXT);
    CREATE TABLE IF NOT EXISTS membres (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, nom TEXT, prenom TEXT, dateEntree TEXT, typeEntree TEXT, dateSortie TEXT, typeSortie TEXT, raisonSortie TEXT, actif INTEGER, sexe TEXT, age INTEGER);
    CREATE TABLE IF NOT EXISTS months (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE IF NOT EXISTS church_config (user_id INTEGER PRIMARY KEY, district TEXT, church TEXT, code TEXT);
    CREATE TABLE IF NOT EXISTS monthly_reports (
      month_id TEXT,
      eglise TEXT,
      sabbath_dates TEXT,
      totalA INTEGER,
      totalB INTEGER,
      totalExpenses INTEGER,
      balanceChurch INTEGER,
      perSabbath TEXT,
      saramPandefasana INTEGER,
      dateVersementFME TEXT,
      rosiaNum TEXT,
      bokyBe TEXT,
      rapano TEXT,
      tatitra TEXT,
      dateFanamarihana TEXT,
      caisseFME TEXT,
      chequeRef TEXT,
      dateCheque TEXT,
      soraBolaDate TEXT,
      soraBolaMontant INTEGER,
      soraBolaLettres TEXT,
      soraBolaSignataire TEXT,
      soraBolaLinesJson TEXT,
      signatures TEXT,
      endOfYear TEXT,
      receiptNumber TEXT,
      note TEXT,
      volamPiangonanaApetraka INTEGER,
      PRIMARY KEY (month_id, eglise)
    );
    CREATE TABLE IF NOT EXISTS frais (month_id TEXT, eglise TEXT, amount INTEGER, PRIMARY KEY (month_id, eglise));
    CREATE TABLE IF NOT EXISTS user_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      userName TEXT,
      userFonction TEXT,
      date TEXT NOT NULL,
      timestamp INTEGER,
      ip TEXT,
      userAgent TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_logs_date ON user_logs(date);
    CREATE TABLE IF NOT EXISTS members_stats (memberName TEXT PRIMARY KEY, totalTithe INTEGER, participations INTEGER, lastMonth TEXT);
  `;

  await db.exec(schemaSQL);

  // ---------- Migrations : ajout des colonnes manquantes ----------
  await ensureColumn(db, 'monthly_reports', 'soraBolaLinesJson', 'TEXT');
  await ensureColumn(db, 'monthly_reports', 'volamPiangonanaApetraka', 'INTEGER');

  // ---------- Insertion des mois 2026 ----------
  const months2026 = [
    '2026-01','2026-02','2026-03','2026-04','2026-05','2026-06',
    '2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'
  ];
  for (const m of months2026) {
    const exists = await db.get('SELECT 1 FROM months WHERE id = ?', m);
    if (!exists) {
      await db.run('INSERT INTO months (id, name) VALUES (?, ?)', m, m);
    }
  }

  console.log('✅ Base de données initialisée avec succès');
  return db;
}

module.exports = { initDb, openDb };