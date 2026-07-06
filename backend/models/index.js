const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { openDb } = require('./db');

// ---------- Users ----------
async function getUserByEmail(email) {
  const db = await openDb();
  return db.get('SELECT * FROM users WHERE email = ?', email);
}

async function getUserById(id) {
  const db = await openDb();
  return db.get('SELECT * FROM users WHERE id = ?', id);
}

async function createUser(user) {
  const db = await openDb();
  const { nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau, photo, adresse, contact, plain_password } = user;
  const result = await db.run(
    `INSERT INTO users (nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau, photo, adresse, contact, plain_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau || 3, photo || '', adresse || '', contact || '', plain_password || ''
  );
  return result.lastID;
}

async function updateUser(id, updates) {
  const db = await openDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);
  await db.run(`UPDATE users SET ${fields} WHERE id = ?`, ...values);
}

async function getAllUsers() {
  const db = await openDb();
  return db.all(`
    SELECT id, nom, prenom, email, eglise, district, federation,
           fonction, niveau, photo, adresse, contact, plain_password
    FROM users
  `);
}

async function deleteUser(id) {
  const db = await openDb();
  await db.run('DELETE FROM users WHERE id = ?', id);
}

async function createAdminIfNotExists() {
  const admin = await getUserByEmail('plateformerapfi@gmail.com');
  if (!admin) {
    console.log('👑 Création de l’administrateur...');
    const hashed = await bcrypt.hash('RH André', 10);
    await createUser({
      nom: 'ADMIN',
      prenom: '',
      eglise: '',
      district: '',
      federation: 'Fédération Madagascar Est',
      responsable: '',
      email: 'plateformerapfi@gmail.com',
      password: hashed,
      fonction: 'Admin',
      niveau: 1,
      photo: '',
      adresse: '',
      contact: '',
      plain_password: 'RH André'
    });
    console.log('✅ Admin créé avec succès');
  } else {
    console.log('ℹ️ L’administrateur existe déjà');
  }
}

async function createEgliseIfNotExists(eglise, district, federation) {
  const db = await openDb();
  const existing = await db.get('SELECT 1 FROM users WHERE eglise = ?', eglise);
  if (existing) return;

  const timestamp = Date.now();
  const email = `eglise_${timestamp}@rapfi.local`;
  const plainPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(plainPassword, 10);

  await createUser({
    nom: eglise,
    prenom: '',
    eglise: eglise,
    district: district || '',
    federation: federation || '',
    responsable: '',
    email: email,
    password: hashed,
    fonction: 'Ancien',
    niveau: 3,
    photo: '',
    adresse: '',
    contact: '',
    plain_password: plainPassword
  });

  console.log(`✅ Église "${eglise}" créée avec succès (email: ${email})`);
}

// ---------- Récupération des églises par district/fédération ----------
async function getEglisesByDistrict(district) {
  const db = await openDb();
  const users = await db.all(
    'SELECT DISTINCT eglise FROM users WHERE district = ? AND eglise IS NOT NULL AND eglise != ""',
    district
  );
  const gl = await db.all(
    'SELECT DISTINCT eglise FROM gl_data WHERE district = ? AND eglise IS NOT NULL AND eglise != ""',
    district
  );
  const dep = await db.all(
    'SELECT DISTINCT eglise FROM depenses WHERE district = ? AND eglise IS NOT NULL AND eglise != ""',
    district
  );
  const allEglises = new Set();
  users.forEach(u => { if (u.eglise) allEglises.add(u.eglise); });
  gl.forEach(g => { if (g.eglise) allEglises.add(g.eglise); });
  dep.forEach(d => { if (d.eglise) allEglises.add(d.eglise); });
  return Array.from(allEglises);
}

async function getEglisesByFederation(federation) {
  const db = await openDb();
  const users = await db.all(
    'SELECT DISTINCT eglise FROM users WHERE federation = ? AND eglise IS NOT NULL AND eglise != ""',
    federation
  );
  const gl = await db.all(
    'SELECT DISTINCT eglise FROM gl_data WHERE federation = ? AND eglise IS NOT NULL AND eglise != ""',
    federation
  );
  const dep = await db.all(
    'SELECT DISTINCT eglise FROM depenses WHERE federation = ? AND eglise IS NOT NULL AND eglise != ""',
    federation
  );
  const allEglises = new Set();
  users.forEach(u => { if (u.eglise) allEglises.add(u.eglise); });
  gl.forEach(g => { if (g.eglise) allEglises.add(g.eglise); });
  dep.forEach(d => { if (d.eglise) allEglises.add(d.eglise); });
  return Array.from(allEglises);
}

// ---------- Grand Livre ----------
async function saveGLData({ userId, month, data, eglise, district, federation }) {
  const db = await openDb();
  await db.run('DELETE FROM gl_data WHERE user_id = ? AND month = ? AND eglise = ?', userId, month, eglise);
  await db.run(
    'INSERT INTO gl_data (user_id, month, data, eglise, district, federation) VALUES (?, ?, ?, ?, ?, ?)',
    userId, month, JSON.stringify(data), eglise, district, federation
  );
}

async function getGLDataByEglise(month, eglise) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM gl_data WHERE month = ? AND eglise = ?', month, eglise);
  const result = {};
  for (const row of rows) {
    const data = JSON.parse(row.data);
    for (const sabbathIndex in data) {
      if (!result[sabbathIndex]) result[sabbathIndex] = [];
      result[sabbathIndex] = result[sabbathIndex].concat(data[sabbathIndex]);
    }
  }
  return result;
}

async function getGLDataByDistrict(month, district) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM gl_data WHERE month = ? AND district = ?', month, district);
  const result = {};
  for (const row of rows) {
    const data = JSON.parse(row.data);
    for (const sabbathIndex in data) {
      if (!result[sabbathIndex]) result[sabbathIndex] = [];
      result[sabbathIndex] = result[sabbathIndex].concat(data[sabbathIndex]);
    }
  }
  return result;
}

async function getGLDataByFederation(month, federation) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM gl_data WHERE month = ? AND federation = ?', month, federation);
  const result = {};
  for (const row of rows) {
    const data = JSON.parse(row.data);
    for (const sabbathIndex in data) {
      if (!result[sabbathIndex]) result[sabbathIndex] = [];
      result[sabbathIndex] = result[sabbathIndex].concat(data[sabbathIndex]);
    }
  }
  return result;
}

async function getGLDataForAdmin(month, federation, district, eglise) {
  const db = await openDb();
  let sql = 'SELECT data FROM gl_data WHERE month = ?';
  const params = [month];
  if (federation) { sql += ' AND federation = ?'; params.push(federation); }
  if (district) { sql += ' AND district = ?'; params.push(district); }
  if (eglise) { sql += ' AND eglise = ?'; params.push(eglise); }
  const rows = await db.all(sql, params);
  const result = {};
  for (const row of rows) {
    const data = JSON.parse(row.data);
    for (const sabbathIndex in data) {
      if (!result[sabbathIndex]) result[sabbathIndex] = [];
      result[sabbathIndex] = result[sabbathIndex].concat(data[sabbathIndex]);
    }
  }
  return result;
}

// ---------- Dépenses ----------
async function saveDepenses({ userId, month, data, eglise, district, federation }) {
  const db = await openDb();
  await db.run('DELETE FROM depenses WHERE user_id = ? AND month = ? AND eglise = ?', userId, month, eglise);
  for (const dep of data) {
    await db.run(
      'INSERT INTO depenses (user_id, month, data, eglise, district, federation) VALUES (?, ?, ?, ?, ?, ?)',
      userId, month, JSON.stringify(dep), eglise, district, federation
    );
  }
}

async function getDepensesByEglise(month, eglise) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND eglise = ?', month, eglise);
  const result = [];
  for (const row of rows) {
    result.push(JSON.parse(row.data));
  }
  return result;
}

async function getDepensesByDistrict(month, district) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND district = ?', month, district);
  const result = [];
  for (const row of rows) {
    result.push(JSON.parse(row.data));
  }
  return result;
}

async function getDepensesByFederation(month, federation) {
  const db = await openDb();
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND federation = ?', month, federation);
  const result = [];
  for (const row of rows) {
    result.push(JSON.parse(row.data));
  }
  return result;
}

async function getDepensesForAdmin(month, federation, district, eglise) {
  const db = await openDb();
  let sql = 'SELECT data FROM depenses WHERE month = ?';
  const params = [month];
  if (federation) { sql += ' AND federation = ?'; params.push(federation); }
  if (district) { sql += ' AND district = ?'; params.push(district); }
  if (eglise) { sql += ' AND eglise = ?'; params.push(eglise); }
  const rows = await db.all(sql, params);
  const result = [];
  for (const row of rows) {
    result.push(JSON.parse(row.data));
  }
  return result;
}

// ---------- Membres ----------
async function getMembres(userId) {
  const db = await openDb();
  return db.all('SELECT * FROM membres WHERE user_id = ?', userId);
}

async function addMembre(userId, membre) {
  const db = await openDb();
  const { nom, prenom, dateEntree, typeEntree, dateSortie, typeSortie, raisonSortie, actif, sexe, age } = membre;
  const result = await db.run(
    `INSERT INTO membres (user_id, nom, prenom, dateEntree, typeEntree, dateSortie, typeSortie, raisonSortie, actif, sexe, age)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    userId, nom, prenom, dateEntree, typeEntree, dateSortie, typeSortie, raisonSortie, actif, sexe, age
  );
  return result.lastID;
}

async function updateMembre(userId, id, updates) {
  const db = await openDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id, userId);
  await db.run(`UPDATE membres SET ${fields} WHERE id = ? AND user_id = ?`, ...values);
}

async function deleteMembre(userId, id) {
  const db = await openDb();
  await db.run('DELETE FROM membres WHERE id = ? AND user_id = ?', id, userId);
}

// ---------- Mois ----------
async function getMonths() {
  const db = await openDb();
  return db.all('SELECT id, name FROM months ORDER BY id');
}

async function addMonth(id, name) {
  const db = await openDb();
  const exists = await db.get('SELECT 1 FROM months WHERE id = ?', id);
  if (!exists) {
    await db.run('INSERT INTO months (id, name) VALUES (?, ?)', id, name || id);
  }
}

// ---------- Configuration église ----------
async function getChurchConfig(userId) {
  const db = await openDb();
  return db.get('SELECT * FROM church_config WHERE user_id = ?', userId);
}

async function saveChurchConfig(userId, config) {
  const db = await openDb();
  if (db.isPostgres) {
    await db.run(
      `INSERT INTO church_config (user_id, district, church, code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         district = EXCLUDED.district,
         church = EXCLUDED.church,
         code = EXCLUDED.code`,
      userId, config.district, config.church, config.code
    );
  } else {
    await db.run(
      'INSERT OR REPLACE INTO church_config (user_id, district, church, code) VALUES (?, ?, ?, ?)',
      userId, config.district, config.church, config.code
    );
  }
}

// ---------- Rapports mensuels ----------
async function getMonthlyReport(month, eglise) {
  const db = await openDb();
  // S'assurer que toutes les colonnes sont sélectionnées
  return db.get('SELECT * FROM monthly_reports WHERE month_id = ? AND eglise = ?', month, eglise);
}

async function updateReportField(month, eglise, field, value) {
  const db = await openDb();
  // 🔒 Liste des champs autorisés (sécurité)
  const allowedFields = [
    'sabbath_dates', 'totalA', 'totalB', 'totalExpenses', 'balanceChurch',
    'saramPandefasana', 'dateVersementFME', 'rosiaNum', 'bokyBe', 'rapano',
    'tatitra', 'dateFanamarihana', 'caisseFME', 'chequeRef', 'dateCheque',
    'soraBolaDate', 'soraBolaMontant', 'soraBolaLettres', 'soraBolaSignataire',
    'soraBolaLinesJson', 'signatures', 'endOfYear', 'receiptNumber', 'note'
  ];
  if (!allowedFields.includes(field)) {
    throw new Error(`Champ non autorisé : ${field}`);
  }
  // Exécution de la mise à jour
  await db.run(`UPDATE monthly_reports SET ${field} = ? WHERE month_id = ? AND eglise = ?`, value, month, eglise);
  console.log(`✅ updateReportField: ${field} mis à jour pour ${month} - ${eglise}`);
}

// 🔥 CORRECTION : filtrer les clés pour éviter la duplication
async function upsertMonthlyReport(month, eglise, data) {
  const db = await openDb();
  // Filtrer les clés pour exclure month_id et eglise (déjà passés en paramètres)
  const keys = Object.keys(data).filter(k => k !== 'month_id' && k !== 'eglise');
  const columns = ['month_id', 'eglise', ...keys];
  const values = [month, eglise, ...keys.map(k => data[k])];

  if (db.isPostgres) {
    const placeholders = keys.map((_, i) => `$${i + 3}`).join(', ');
    const updateSet = keys.map(k => `${k} = EXCLUDED.${k}`).join(', ');
    const sql = `
      INSERT INTO monthly_reports (${columns.join(', ')})
      VALUES ($1, $2, ${placeholders})
      ON CONFLICT (month_id, eglise) DO UPDATE SET ${updateSet}
    `;
    await db.run(sql, ...values);
  } else {
    const placeholdersSQL = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO monthly_reports (${columns.join(', ')}) VALUES (?, ?, ${placeholdersSQL})`;
    await db.run(sql, ...values);
  }
}

// ---------- Fonction de recalcul du rapport mensuel ----------
async function computeAndSaveMonthlyReports(monthId, eglise) {
  const db = await openDb();

  const glRows = await db.all('SELECT data FROM gl_data WHERE month = ? AND eglise = ?', monthId, eglise);
  const allEntries = [];
  for (const row of glRows) {
    const data = JSON.parse(row.data);
    for (const sabbathIndex in data) {
      const entries = data[sabbathIndex];
      for (const entry of entries) {
        allEntries.push({ ...entry, sabbathIndex: parseInt(sabbathIndex) });
      }
    }
  }

  let totalA = 0, totalB = 0;
  for (const entry of allEntries) {
    totalA += (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
              (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
    totalB += (entry.b9 || 0) + (entry.b10 || 0);
  }

  const depRows = await db.all('SELECT data FROM depenses WHERE month = ? AND eglise = ?', monthId, eglise);
  let totalExpenses = 0;
  for (const row of depRows) {
    const dep = JSON.parse(row.data);
    totalExpenses += dep.amount || 0;
  }

  const oldReport = await getMonthlyReport(monthId, eglise);
  const sabbathDates = (oldReport && oldReport.sabbath_dates) ? JSON.parse(oldReport.sabbath_dates) : ["", "", "", "", ""];
  const saramPandefasana = oldReport?.saramPandefasana || 0;
  const dateVersementFME = oldReport?.dateVersementFME || "";
  const rosiaNum = oldReport?.rosiaNum || "";
  const bokyBe = oldReport?.bokyBe || "";
  const rapano = oldReport?.rapano || "";
  const tatitra = oldReport?.tatitra || "";
  const dateFanamarihana = oldReport?.dateFanamarihana || "";
  const caisseFME = oldReport?.caisseFME || "";
  const chequeRef = oldReport?.chequeRef || "";
  const dateCheque = oldReport?.dateCheque || "";
  const soraBolaDate = oldReport?.soraBolaDate || "";
  const soraBolaMontant = oldReport?.soraBolaMontant || 0;
  const soraBolaLettres = oldReport?.soraBolaLettres || "";
  const soraBolaSignataire = oldReport?.soraBolaSignataire || "";
  const soraBolaLinesJson = oldReport?.soraBolaLinesJson || "";
  const signatures = oldReport?.signatures || "";
  const endOfYear = oldReport?.endOfYear || "";
  const receiptNumber = oldReport?.receiptNumber || "";
  const note = oldReport?.note || "";

  const balanceChurch = totalB - totalExpenses;

  const report = {
    sabbath_dates: JSON.stringify(sabbathDates),
    totalA,
    totalB,
    totalExpenses,
    balanceChurch,
    saramPandefasana,
    dateVersementFME,
    rosiaNum,
    bokyBe,
    rapano,
    tatitra,
    dateFanamarihana,
    caisseFME,
    chequeRef,
    dateCheque,
    soraBolaDate,
    soraBolaMontant,
    soraBolaLettres,
    soraBolaSignataire,
    soraBolaLinesJson,
    signatures,
    endOfYear,
    receiptNumber,
    note
  };

  await upsertMonthlyReport(monthId, eglise, report);

  console.log(`✅ Rapport mensuel recalculé pour ${monthId} - ${eglise}`);
}

// ---------- Frais ----------
async function getFrais(month, eglise) {
  const db = await openDb();
  const row = await db.get('SELECT amount FROM frais WHERE month_id = ? AND eglise = ?', month, eglise);
  return row ? row.amount : 0;
}

async function setFrais(month, eglise, amount) {
  const db = await openDb();
  if (db.isPostgres) {
    await db.run(
      `INSERT INTO frais (month_id, eglise, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (month_id, eglise) DO UPDATE SET amount = EXCLUDED.amount`,
      month, eglise, amount
    );
  } else {
    await db.run(
      'INSERT OR REPLACE INTO frais (month_id, eglise, amount) VALUES (?, ?, ?)',
      month, eglise, amount
    );
  }
}

// ---------- Suppression ----------
async function deleteAllDataForMonth(month, eglise) {
  const db = await openDb();
  await db.run('DELETE FROM gl_data WHERE month = ? AND eglise = ?', month, eglise);
  await db.run('DELETE FROM depenses WHERE month = ? AND eglise = ?', month, eglise);
  await db.run('DELETE FROM monthly_reports WHERE month_id = ? AND eglise = ?', month, eglise);
  await db.run('DELETE FROM frais WHERE month_id = ? AND eglise = ?', month, eglise);
}

// ---------- LOGS ----------
async function addUserLog(userId, userName, userFonction, ip = '', userAgent = '') {
  const db = await openDb();
  await db.run(
    'INSERT INTO user_logs (user_id, userName, userFonction, date, timestamp, ip, userAgent) VALUES (?, ?, ?, ?, ?, ?, ?)',
    userId, userName, userFonction, new Date().toISOString(), Date.now(), ip, userAgent
  );
}

async function getUserLogs(limit = 100, offset = 0) {
  const db = await openDb();
  const query = `
    WITH ranked AS (
      SELECT 
        *,
        LEAD(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) AS next_timestamp
      FROM user_logs
    )
    SELECT 
      id, user_id, userName, userFonction, date, timestamp, ip,
      CASE 
        WHEN next_timestamp IS NOT NULL THEN (next_timestamp - timestamp) 
        ELSE NULL 
      END AS session_duration_seconds
    FROM ranked
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;
  return db.all(query, limit, offset);
}

async function getLogsCount() {
  const db = await openDb();
  const result = await db.get('SELECT COUNT(*) as total FROM user_logs');
  return result.total;
}

async function getUniqueVisitorsCount() {
  const db = await openDb();
  const result = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM user_logs');
  return result.count;
}

async function getVisitsPerUser() {
  const db = await openDb();
  return db.all(`
    SELECT 
      l.user_id, 
      u.nom, 
      u.prenom,
      COUNT(*) as count 
    FROM user_logs l
    LEFT JOIN users u ON l.user_id = u.id
    GROUP BY l.user_id, u.nom, u.prenom
    ORDER BY count DESC
  `);
}

// ---------- Statistiques membres ----------
async function getMembersStats() {
  const db = await openDb();
  return db.all('SELECT * FROM members_stats');
}

// ---------- Récupérer les infos d'une église ----------
async function getEgliseInfo(eglise) {
  const db = await openDb();
  const row = await db.get('SELECT district, federation FROM users WHERE eglise = ? LIMIT 1', eglise);
  return row;
}

// ---------- Exportations ----------
module.exports = {
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  getAllUsers,
  deleteUser,
  createAdminIfNotExists,
  createEgliseIfNotExists,
  getEglisesByDistrict,
  getEglisesByFederation,
  saveGLData,
  getGLDataByEglise,
  getGLDataByDistrict,
  getGLDataByFederation,
  getGLDataForAdmin,
  saveDepenses,
  getDepensesByEglise,
  getDepensesByDistrict,
  getDepensesByFederation,
  getDepensesForAdmin,
  getMembres,
  addMembre,
  updateMembre,
  deleteMembre,
  getMonths,
  addMonth,
  getChurchConfig,
  saveChurchConfig,
  getMonthlyReport,
  updateReportField,
  upsertMonthlyReport,
  computeAndSaveMonthlyReports,
  getFrais,
  setFrais,
  deleteAllDataForMonth,
  addUserLog,
  getUserLogs,
  getLogsCount,
  getUniqueVisitorsCount,
  getVisitsPerUser,
  getMembersStats,
  getEgliseInfo
};