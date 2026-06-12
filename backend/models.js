const bcrypt = require('bcryptjs');
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
  const { nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau, photo, adresse, contact } = user;
  const result = await db.run(
    `INSERT INTO users (nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau, photo, adresse, contact)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nom, prenom, eglise, district, federation, responsable, email, password, fonction, niveau || 3, photo || '', adresse || '', contact || ''
  );
  return result.lastID;
}
async function updateUser(id, updates) {
  const db = await openDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);
  await db.run(`UPDATE users SET ${fields} WHERE id = ?`, values);
}
async function getAllUsers() {
  const db = await openDb();
  return db.all('SELECT id, nom, prenom, email, eglise, district, federation, fonction, niveau, photo, adresse, contact FROM users');
}
async function deleteUser(id) {
  const db = await openDb();
  await db.run('DELETE FROM users WHERE id = ?', id);
}
async function createAdminIfNotExists() {
  const admin = await getUserByEmail('admin@eglise.com');
  if (!admin) {
    const hashed = await bcrypt.hash('RH André', 10);
    await createUser({
      nom: 'ADMIN', prenom: '', eglise: '', district: '', federation: 'FME', responsable: '',
      email: 'admin@eglise.com', password: hashed, fonction: 'Admin', niveau: 1
    });
    console.log('✅ Admin créé');
  }
}

// ---------- GL ----------
async function saveGLData(userId, month, data) {
  const db = await openDb();
  await db.run('INSERT OR REPLACE INTO gl_data (user_id, month, data) VALUES (?, ?, ?)', userId, month, JSON.stringify(data));
}
async function getGLData(userId, month) {
  const db = await openDb();
  const row = await db.get('SELECT data FROM gl_data WHERE user_id = ? AND month = ?', userId, month);
  return row ? JSON.parse(row.data) : null;
}

// ---------- Dépenses ----------
async function saveDepenses(userId, month, data) {
  const db = await openDb();
  await db.run('INSERT OR REPLACE INTO depenses (user_id, month, data) VALUES (?, ?, ?)', userId, month, JSON.stringify(data));
}
async function getDepenses(userId, month) {
  const db = await openDb();
  const row = await db.get('SELECT data FROM depenses WHERE user_id = ? AND month = ?', userId, month);
  return row ? JSON.parse(row.data) : [];
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
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    userId, nom, prenom, dateEntree, typeEntree, dateSortie, typeSortie, raisonSortie, actif, sexe, age
  );
  return result.lastID;
}
async function updateMembre(userId, id, updates) {
  const db = await openDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id, userId);
  await db.run(`UPDATE membres SET ${fields} WHERE id = ? AND user_id = ?`, values);
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
  await db.run('INSERT INTO months (id, name) VALUES (?, ?)', id, name || id);
}

// ---------- Configuration église ----------
async function getChurchConfig(userId) {
  const db = await openDb();
  return db.get('SELECT * FROM church_config WHERE user_id = ?', userId);
}
async function saveChurchConfig(userId, config) {
  const db = await openDb();
  await db.run(
    'INSERT OR REPLACE INTO church_config (user_id, district, church, code) VALUES (?, ?, ?, ?)',
    userId, config.district, config.church, config.code
  );
}

// ---------- Rapports mensuels ----------
async function getMonthlyReport(month, eglise) {
  const db = await openDb();
  return db.get('SELECT * FROM monthly_reports WHERE month_id = ? AND eglise = ?', month, eglise);
}
async function updateReportField(month, eglise, field, value) {
  const db = await openDb();
  await db.run(`UPDATE monthly_reports SET ${field} = ? WHERE month_id = ? AND eglise = ?`, value, month, eglise);
}
async function upsertMonthlyReport(month, eglise, data) {
  const db = await openDb();
  const existing = await getMonthlyReport(month, eglise);
  if (existing) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    values.push(month, eglise);
    await db.run(`UPDATE monthly_reports SET ${fields} WHERE month_id = ? AND eglise = ?`, values);
  } else {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    values.push(month, eglise);
    await db.run(`INSERT INTO monthly_reports (month_id, eglise, ${columns}) VALUES (?, ?, ${placeholders})`, values);
  }
}

// ---------- Frais ----------
async function getFrais(month, eglise) {
  const db = await openDb();
  const row = await db.get('SELECT amount FROM frais WHERE month_id = ? AND eglise = ?', month, eglise);
  return row ? row.amount : 0;
}
async function setFrais(month, eglise, amount) {
  const db = await openDb();
  await db.run('INSERT OR REPLACE INTO frais (month_id, eglise, amount) VALUES (?, ?, ?)', month, eglise, amount);
}

// ---------- Logs ----------
async function addUserLog(userId, userName, userFonction) {
  const db = await openDb();
  await db.run(
    'INSERT INTO user_logs (user_id, userName, userFonction, date, timestamp) VALUES (?, ?, ?, ?, ?)',
    userId, userName, userFonction, new Date().toISOString(), Date.now()
  );
}
async function getUserLogs() {
  const db = await openDb();
  return db.all('SELECT * FROM user_logs ORDER BY timestamp DESC');
}
async function getUniqueVisitorsCount() {
  const db = await openDb();
  const res = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM user_logs');
  return res.count;
}
async function getVisitsPerUser() {
  const db = await openDb();
  const rows = await db.all('SELECT user_id, userName, COUNT(*) as count FROM user_logs GROUP BY user_id, userName');
  return rows;
}

// ---------- Statistiques membres ----------
async function getMembersStats() {
  const db = await openDb();
  return db.all('SELECT * FROM members_stats');
}
async function updateMemberStats(memberName, totalTithe, participations, lastMonth) {
  const db = await openDb();
  await db.run(
    'INSERT OR REPLACE INTO members_stats (memberName, totalTithe, participations, lastMonth) VALUES (?, ?, ?, ?)',
    memberName, totalTithe, participations, lastMonth
  );
}

module.exports = {
  getUserByEmail, getUserById, createUser, updateUser, getAllUsers, deleteUser, createAdminIfNotExists,
  saveGLData, getGLData,
  saveDepenses, getDepenses,
  getMembres, addMembre, updateMembre, deleteMembre,
  getMonths, addMonth,
  getChurchConfig, saveChurchConfig,
  getMonthlyReport, updateReportField, upsertMonthlyReport,
  getFrais, setFrais,
  addUserLog, getUserLogs, getUniqueVisitorsCount, getVisitsPerUser,
  getMembersStats, updateMemberStats
};