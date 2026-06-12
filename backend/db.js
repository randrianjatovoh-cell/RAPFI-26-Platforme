const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: './data/rapfi.db',
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT, prenom TEXT, eglise TEXT, district TEXT, federation TEXT,
      responsable TEXT, email TEXT UNIQUE, password TEXT,
      fonction TEXT, niveau INTEGER, photo TEXT, adresse TEXT, contact TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS gl_data (
      user_id INTEGER,
      month TEXT,
      data TEXT,
      PRIMARY KEY (user_id, month)
    );
    CREATE TABLE IF NOT EXISTS depenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      month TEXT,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS membres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      nom TEXT, prenom TEXT, dateEntree TEXT,
      typeEntree TEXT, dateSortie TEXT, typeSortie TEXT,
      raisonSortie TEXT, actif INTEGER, sexe TEXT, age INTEGER
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
      totalA INTEGER, totalB INTEGER, totalExpenses INTEGER, balanceChurch INTEGER,
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
      PRIMARY KEY (month_id, eglise)
    );
    CREATE TABLE IF NOT EXISTS frais (
      month_id TEXT,
      eglise TEXT,
      amount INTEGER,
      PRIMARY KEY (month_id, eglise)
    );
    CREATE TABLE IF NOT EXISTS user_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      userName TEXT,
      userFonction TEXT,
      date TEXT,
      timestamp INTEGER
    );
    CREATE TABLE IF NOT EXISTS members_stats (
      memberName TEXT PRIMARY KEY,
      totalTithe INTEGER,
      participations INTEGER,
      lastMonth TEXT
    );
  `);
  // Insertion des mois 2026 par défaut
  const months2026 = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10','2026-11','2026-12'];
  for (const m of months2026) {
    await db.run('INSERT OR IGNORE INTO months (id, name) VALUES (?, ?)', m, m);
  }
  return db;
}

module.exports = { initDb, openDb };