// backend/models/index.js
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { openDb } = require('./db');

// ============================================================
// UTILITAIRES
// ============================================================

function sanitizeEgliseName(eglise) {
  if (!eglise) return '';
  
  const sansAccents = eglise.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const sansEspaces = sansAccents.replace(/\s+/g, '_');
  const sanitized = sansEspaces.replace(/[^a-zA-Z0-9_]/g, '');
  return sanitized.toLowerCase();
}

// ============================================================
// USERS
// ============================================================

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
    console.log('👑 Création de l\'administrateur...');
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
    console.log('ℹ️ L\'administrateur existe déjà');
  }
}

// ============================================================
// CRÉATION D'ÉGLISE - AVEC EMAIL @rapfi.eg
// ============================================================

async function createEgliseIfNotExists(eglise, district, federation) {
  const db = await openDb();
  
  const existing = await db.get('SELECT 1 FROM users WHERE eglise = ?', eglise);
  if (existing) {
    console.log(`ℹ️ L'église "${eglise}" existe déjà`);
    return { exists: true };
  }

  const emailPrefix = sanitizeEgliseName(eglise);
  let email = `${emailPrefix}@rapfi.eg`;
  
  const emailExists = await db.get('SELECT 1 FROM users WHERE email = ?', email);
  if (emailExists) {
    const timestamp = Date.now();
    email = `${emailPrefix}_${timestamp}@rapfi.eg`;
    console.log(`⚠️ Email ${emailPrefix}@rapfi.eg déjà utilisé, utilisation de ${email}`);
  }
  
  const plainPassword = crypto.randomBytes(8).toString('hex');
  const hashed = await bcrypt.hash(plainPassword, 10);

  const result = await db.run(
    `INSERT INTO users (
      nom, prenom, eglise, district, federation, responsable, 
      email, password, fonction, niveau, photo, adresse, contact, plain_password
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    eglise, '', eglise, district || '', federation || '', '',
    email, hashed, 'Ancien', 3, '', '', '', plainPassword
  );

  console.log(`✅ Église "${eglise}" créée avec succès`);
  console.log(`   📧 Email: ${email}`);
  console.log(`   🔑 Mot de passe: ${plainPassword}`);
  
  return { 
    id: result.lastID, 
    email, 
    plainPassword,
    exists: false 
  };
}

// ============================================================
// RÉCUPÉRATION DES ÉGLISES
// ============================================================

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

async function getEgliseInfo(eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  const row = await db.get('SELECT district, federation, email FROM users WHERE eglise = ? LIMIT 1', cleanEglise);
  return row;
}

// ============================================================
// GRAND LIVRE (GL)
// ============================================================

async function saveGLData({ userId, month, data, eglise, district, federation }) {
  const db = await openDb();
  
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise) {
    throw new Error('Le nom de l\'église est requis');
  }

  console.log(`📝 saveGLData: Mois=${month}, Église=${cleanEglise}`);

  const sabbathIndices = Object.keys(data).filter(key => !isNaN(key));
  
  for (const sabbathIndex of sabbathIndices) {
    const entries = data[sabbathIndex];
    if (!entries || entries.length === 0) continue;
    
    const enrichedEntries = entries.map(entry => ({
      ...entry,
      monthId: month,
      eglise: cleanEglise,
      sabbathIndex: parseInt(sabbathIndex)
    }));

    const existing = await db.get(
      'SELECT id FROM gl_data WHERE month = ? AND eglise = ? AND sabbath_index = ?',
      month, cleanEglise, parseInt(sabbathIndex)
    );
    
    if (existing) {
      console.log(`📝 Mise à jour des données pour ${cleanEglise} - ${month} - Sabbat ${sabbathIndex}`);
      
      if (db.isPostgres) {
        await db.run(
          `UPDATE gl_data 
           SET data = $1, district = $2, federation = $3, user_id = $4
           WHERE month = $5 AND eglise = $6 AND sabbath_index = $7`,
          JSON.stringify(enrichedEntries), district, federation, userId,
          month, cleanEglise, parseInt(sabbathIndex)
        );
      } else {
        await db.run(
          `UPDATE gl_data 
           SET data = ?, district = ?, federation = ?, user_id = ?
           WHERE month = ? AND eglise = ? AND sabbath_index = ?`,
          JSON.stringify(enrichedEntries), district, federation, userId,
          month, cleanEglise, parseInt(sabbathIndex)
        );
      }
    } else {
      console.log(`📝 Insertion de nouvelles données pour ${cleanEglise} - ${month} - Sabbat ${sabbathIndex}`);
      
      if (db.isPostgres) {
        await db.run(
          `INSERT INTO gl_data (user_id, month, eglise, district, federation, sabbath_index, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          userId, month, cleanEglise, district, federation, parseInt(sabbathIndex), JSON.stringify(enrichedEntries)
        );
      } else {
        await db.run(
          `INSERT INTO gl_data (user_id, month, eglise, district, federation, sabbath_index, data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          userId, month, cleanEglise, district, federation, parseInt(sabbathIndex), JSON.stringify(enrichedEntries)
        );
      }
    }
  }
  
  console.log(`✅ GL sauvegardé pour ${cleanEglise} - ${month}`);
}

async function getGLDataByEglise(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise) return {};
  
  const rows = await db.all(
    'SELECT sabbath_index, data FROM gl_data WHERE month = ? AND eglise = ?',
    month, cleanEglise
  );
  
  const result = {};
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (Array.isArray(data)) {
        result[row.sabbath_index] = data;
      } else {
        result[row.sabbath_index] = data;
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing data pour ${month} - ${cleanEglise}, sabbath ${row.sabbath_index}`);
      result[row.sabbath_index] = [];
    }
  }
  return result;
}

async function getGLDataByDistrict(month, district) {
  const db = await openDb();
  const cleanDistrict = district ? district.trim() : '';
  if (!cleanDistrict) return {};
  
  const rows = await db.all(
    'SELECT eglise, sabbath_index, data FROM gl_data WHERE month = ? AND district = ?',
    month, cleanDistrict
  );
  
  const result = {};
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (!result[row.sabbath_index]) result[row.sabbath_index] = [];
      if (Array.isArray(data)) {
        result[row.sabbath_index] = result[row.sabbath_index].concat(data);
      } else {
        result[row.sabbath_index] = result[row.sabbath_index].concat([data]);
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing data pour ${month} - ${row.eglise}, sabbath ${row.sabbath_index}`);
    }
  }
  return result;
}

async function getGLDataByFederation(month, federation) {
  const db = await openDb();
  const cleanFederation = federation ? federation.trim() : '';
  if (!cleanFederation) return {};
  
  const rows = await db.all(
    'SELECT eglise, sabbath_index, data FROM gl_data WHERE month = ? AND federation = ?',
    month, cleanFederation
  );
  
  const result = {};
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (!result[row.sabbath_index]) result[row.sabbath_index] = [];
      if (Array.isArray(data)) {
        result[row.sabbath_index] = result[row.sabbath_index].concat(data);
      } else {
        result[row.sabbath_index] = result[row.sabbath_index].concat([data]);
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing data pour ${month} - ${row.eglise}, sabbath ${row.sabbath_index}`);
    }
  }
  return result;
}

async function getGLDataForAdmin(month, federation, district, eglise) {
  const db = await openDb();
  let sql = 'SELECT eglise, sabbath_index, data FROM gl_data WHERE month = ?';
  const params = [month];
  
  if (federation) { sql += ' AND federation = ?'; params.push(federation.trim()); }
  if (district) { sql += ' AND district = ?'; params.push(district.trim()); }
  if (eglise) { sql += ' AND eglise = ?'; params.push(eglise.trim()); }
  
  const rows = await db.all(sql, params);
  
  const result = {};
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (!result[row.sabbath_index]) result[row.sabbath_index] = [];
      if (Array.isArray(data)) {
        result[row.sabbath_index] = result[row.sabbath_index].concat(data);
      } else {
        result[row.sabbath_index] = result[row.sabbath_index].concat([data]);
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing data pour ${month} - ${row.eglise}`);
    }
  }
  return result;
}

// ============================================================
// VÉRIFICATION DES DONNÉES EXISTANTES
// ============================================================

async function hasGLDataForEglise(month, eglise, sabbathIndex = null) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise || !month) return false;
  
  let sql = 'SELECT COUNT(*) as count FROM gl_data WHERE month = ? AND eglise = ?';
  const params = [month, cleanEglise];
  
  if (sabbathIndex !== null) {
    sql += ' AND sabbath_index = ?';
    params.push(parseInt(sabbathIndex));
  }
  
  const result = await db.get(sql, ...params);
  return result.count > 0;
}

// ============================================================
// DÉPENSES
// ============================================================

async function saveDepenses({ userId, month, data, eglise, district, federation }) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  
  await db.run('DELETE FROM depenses WHERE month = ? AND eglise = ?', month, cleanEglise);
  
  for (const dep of data) {
    const depWithSabata = {
      ...dep,
      sabata: dep.sabata || 1
    };
    await db.run(
      'INSERT INTO depenses (user_id, month, data, eglise, district, federation) VALUES (?, ?, ?, ?, ?, ?)',
      userId, month, JSON.stringify(depWithSabata), cleanEglise, district, federation
    );
  }
  
  console.log(`✅ Dépenses sauvegardées pour ${cleanEglise} - ${month}`);
}

async function getDepensesByEglise(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND eglise = ?', month, cleanEglise);
  const result = [];
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (data && typeof data === 'object' && !data.sabata) {
        data.sabata = 1;
      }
      result.push(data);
    } catch (e) {
      console.warn(`⚠️ Erreur parsing dépense ${month} - ${cleanEglise}`);
    }
  }
  return result;
}

async function getDepensesByDistrict(month, district) {
  const db = await openDb();
  const cleanDistrict = district ? district.trim() : '';
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND district = ?', month, cleanDistrict);
  const result = [];
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (data && typeof data === 'object' && !data.sabata) {
        data.sabata = 1;
      }
      result.push(data);
    } catch (e) {
      console.warn(`⚠️ Erreur parsing dépense ${month} - ${cleanDistrict}`);
    }
  }
  return result;
}

async function getDepensesByFederation(month, federation) {
  const db = await openDb();
  const cleanFederation = federation ? federation.trim() : '';
  const rows = await db.all('SELECT data FROM depenses WHERE month = ? AND federation = ?', month, cleanFederation);
  const result = [];
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (data && typeof data === 'object' && !data.sabata) {
        data.sabata = 1;
      }
      result.push(data);
    } catch (e) {
      console.warn(`⚠️ Erreur parsing dépense ${month} - ${cleanFederation}`);
    }
  }
  return result;
}

async function getDepensesForAdmin(month, federation, district, eglise) {
  const db = await openDb();
  let sql = 'SELECT data FROM depenses WHERE month = ?';
  const params = [month];
  if (federation) { sql += ' AND federation = ?'; params.push(federation.trim()); }
  if (district) { sql += ' AND district = ?'; params.push(district.trim()); }
  if (eglise) { sql += ' AND eglise = ?'; params.push(eglise.trim()); }
  const rows = await db.all(sql, params);
  const result = [];
  for (const row of rows) {
    try {
      const data = JSON.parse(row.data);
      if (data && typeof data === 'object' && !data.sabata) {
        data.sabata = 1;
      }
      result.push(data);
    } catch (e) {
      console.warn(`⚠️ Erreur parsing dépense`);
    }
  }
  return result;
}

// ============================================================
// MEMBRES
// ============================================================

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

// ============================================================
// MOIS
// ============================================================

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

// ============================================================
// CONFIGURATION ÉGLISE
// ============================================================

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

// ============================================================
// RAPPORTS MENSUELS
// ============================================================

async function getMonthlyReport(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  return db.get('SELECT * FROM monthly_reports WHERE month_id = ? AND eglise = ?', month, cleanEglise);
}

async function updateReportField(month, eglise, field, value) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  let finalValue = value;
  
  if (field === 'soraBolaLinesJson' && typeof value === 'object') {
    finalValue = JSON.stringify(value);
  }
  
  if (field === 'volaSisaTeoAloha') {
    finalValue = parseFloat(value) || 0;
  }
  
  try {
    const result = await db.run(
      `UPDATE monthly_reports SET "${field}" = ? WHERE month_id = ? AND eglise = ?`,
      finalValue, month, cleanEglise
    );
    console.log(`✅ updateReportField: ${field} mis à jour pour ${month} - ${cleanEglise}`);
    if (result.changes === 0) {
      console.warn(`⚠️ Aucune ligne mise à jour pour ${month} - ${cleanEglise}. Création du rapport...`);
      await upsertMonthlyReport(month, cleanEglise, {});
      await db.run(
        `UPDATE monthly_reports SET "${field}" = ? WHERE month_id = ? AND eglise = ?`,
        finalValue, month, cleanEglise
      );
    }
  } catch (err) {
    console.error(`❌ Erreur updateReportField pour ${field}:`, err);
    throw err;
  }
}

async function upsertMonthlyReport(month, eglise, data) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  const keys = Object.keys(data).filter(k => k !== 'month_id' && k !== 'eglise');
  const columns = ['month_id', 'eglise', ...keys];
  const values = [month, cleanEglise, ...keys.map(k => data[k])];

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

async function computeAndSaveMonthlyReports(monthId, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise) {
    console.warn('⚠️ computeAndSaveMonthlyReports: église vide');
    return;
  }

  console.log(`📊 Recalcul du rapport pour ${monthId} - ${cleanEglise}`);

  const glRows = await db.all(
    'SELECT data FROM gl_data WHERE month = ? AND eglise = ?',
    monthId, cleanEglise
  );
  
  const allEntries = [];
  for (const row of glRows) {
    try {
      const data = JSON.parse(row.data);
      if (Array.isArray(data)) {
        allEntries.push(...data);
      } else if (typeof data === 'object') {
        for (const key in data) {
          if (Array.isArray(data[key])) {
            allEntries.push(...data[key]);
          }
        }
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing GL data pour ${monthId} - ${cleanEglise}`);
    }
  }

  let totalA = 0, totalB = 0;
  for (const entry of allEntries) {
    totalA += (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
              (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
    totalB += (entry.b9 || 0) + (entry.b10 || 0);
  }

  const depRows = await db.all(
    'SELECT data FROM depenses WHERE month = ? AND eglise = ?',
    monthId, cleanEglise
  );
  
  let totalExpenses = 0;
  const expensesBySabbath = [0, 0, 0, 0, 0];
  
  for (const row of depRows) {
    try {
      const dep = JSON.parse(row.data);
      const amount = dep.amount || 0;
      totalExpenses += amount;
      
      const sabata = dep.sabata || 1;
      if (sabata >= 1 && sabata <= 5) {
        expensesBySabbath[sabata - 1] += amount;
      } else {
        expensesBySabbath[0] += amount;
      }
    } catch (e) {
      console.warn(`⚠️ Erreur parsing dépense pour ${monthId} - ${cleanEglise}`);
    }
  }

  const oldReport = await getMonthlyReport(monthId, cleanEglise);
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
  const volamPiangonanaApetraka = oldReport?.volamPiangonanaApetraka || 0;
  const volaSisaTeoAloha = oldReport?.volaSisaTeoAloha || 0;

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
    note,
    volamPiangonanaApetraka,
    volaSisaTeoAloha,
    expensesBySabbath: JSON.stringify(expensesBySabbath)
  };

  await upsertMonthlyReport(monthId, cleanEglise, report);
  console.log(`✅ Rapport mensuel recalculé pour ${monthId} - ${cleanEglise}`);
}

// ============================================================
// FRAIS
// ============================================================

async function getFrais(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  const row = await db.get('SELECT amount FROM frais WHERE month_id = ? AND eglise = ?', month, cleanEglise);
  return row ? row.amount : 0;
}

async function setFrais(month, eglise, amount) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (db.isPostgres) {
    await db.run(
      `INSERT INTO frais (month_id, eglise, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (month_id, eglise) DO UPDATE SET amount = EXCLUDED.amount`,
      month, cleanEglise, amount
    );
  } else {
    await db.run(
      'INSERT OR REPLACE INTO frais (month_id, eglise, amount) VALUES (?, ?, ?)',
      month, cleanEglise, amount
    );
  }
}

// ============================================================
// VOLA SISA TEO ALOHA
// ============================================================

async function getVolaSisa(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise || !month) return 0;
  
  try {
    const row = await db.get(
      'SELECT amount FROM vola_sisa_teo_aloha WHERE month_id = ? AND eglise = ?',
      month, cleanEglise
    );
    if (row) {
      return row.amount;
    }
    
    const report = await db.get(
      'SELECT volaSisaTeoAloha FROM monthly_reports WHERE month_id = ? AND eglise = ?',
      month, cleanEglise
    );
    if (report && report.volaSisaTeoAloha !== undefined && report.volaSisaTeoAloha !== null) {
      return report.volaSisaTeoAloha;
    }
    
    return 0;
  } catch (err) {
    console.warn('⚠️ Erreur getVolaSisa:', err);
    return 0;
  }
}

async function setVolaSisa(month, eglise, amount) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  if (!cleanEglise || !month) return;
  
  const finalAmount = parseFloat(amount) || 0;
  
  try {
    if (db.isPostgres) {
      await db.run(
        `INSERT INTO vola_sisa_teo_aloha (month_id, eglise, amount, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (month_id, eglise) 
         DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP`,
        month, cleanEglise, finalAmount
      );
    } else {
      await db.run(
        `INSERT OR REPLACE INTO vola_sisa_teo_aloha (month_id, eglise, amount, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        month, cleanEglise, finalAmount
      );
    }
    
    try {
      await db.run(
        `UPDATE monthly_reports SET volaSisaTeoAloha = ? WHERE month_id = ? AND eglise = ?`,
        finalAmount, month, cleanEglise
      );
    } catch (err) {
      // Ignorer l'erreur si la colonne n'existe pas
    }
    
    console.log(`✅ volaSisaTeoAloha sauvegardé: ${finalAmount} pour ${month} - ${cleanEglise}`);
  } catch (err) {
    console.error('❌ Erreur setVolaSisa:', err);
    throw err;
  }
}

// ============================================================
// SUPPRESSION
// ============================================================

async function deleteAllDataForMonth(month, eglise) {
  const db = await openDb();
  const cleanEglise = eglise ? eglise.trim() : '';
  await db.run('DELETE FROM gl_data WHERE month = ? AND eglise = ?', month, cleanEglise);
  await db.run('DELETE FROM depenses WHERE month = ? AND eglise = ?', month, cleanEglise);
  await db.run('DELETE FROM monthly_reports WHERE month_id = ? AND eglise = ?', month, cleanEglise);
  await db.run('DELETE FROM frais WHERE month_id = ? AND eglise = ?', month, cleanEglise);
  
  try {
    await db.run('DELETE FROM vola_sisa_teo_aloha WHERE month_id = ? AND eglise = ?', month, cleanEglise);
  } catch (err) {
    // Ignorer si la table n'existe pas
  }
  
  console.log(`🗑️ Données supprimées pour ${month} - ${cleanEglise}`);
}

// ============================================================
// LOGS
// ============================================================

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

// ============================================================
// STATISTIQUES MEMBRES
// ============================================================

async function getMembersStats() {
  const db = await openDb();
  return db.all('SELECT * FROM members_stats');
}

// ============================================================
// EXPORTATIONS
// ============================================================

module.exports = {
  // Users
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  getAllUsers,
  deleteUser,
  createAdminIfNotExists,
  
  // Églises
  getEglisesByDistrict,
  getEglisesByFederation,
  getEgliseInfo,
  createEgliseIfNotExists,
  sanitizeEgliseName,
  
  // GL
  saveGLData,
  getGLDataByEglise,
  getGLDataByDistrict,
  getGLDataByFederation,
  getGLDataForAdmin,
  hasGLDataForEglise,
  
  // Dépenses
  saveDepenses,
  getDepensesByEglise,
  getDepensesByDistrict,
  getDepensesByFederation,
  getDepensesForAdmin,
  
  // Membres
  getMembres,
  addMembre,
  updateMembre,
  deleteMembre,
  
  // Mois
  getMonths,
  addMonth,
  
  // Configuration
  getChurchConfig,
  saveChurchConfig,
  
  // Rapports
  getMonthlyReport,
  updateReportField,
  upsertMonthlyReport,
  computeAndSaveMonthlyReports,
  
  // Frais
  getFrais,
  setFrais,
  
  // Vola Sisa
  getVolaSisa,
  setVolaSisa,
  
  // Suppression
  deleteAllDataForMonth,
  
  // Logs
  addUserLog,
  getUserLogs,
  getLogsCount,
  getUniqueVisitorsCount,
  getVisitsPerUser,
  
  // Stats
  getMembersStats
};