const { openDb } = require('./db');

async function migrate() {
  console.log('🔄 Début de la migration des anciennes données...');
  const db = await openDb();

  // ----------------------------------------
  // 1. Vérifier et ajouter les colonnes pour gl_data
  // ----------------------------------------
  const tableInfoGl = await db.all("PRAGMA table_info(gl_data)");
  const hasEglise = tableInfoGl.some(col => col.name === 'eglise');
  const hasDistrict = tableInfoGl.some(col => col.name === 'district');
  const hasFederation = tableInfoGl.some(col => col.name === 'federation');

  if (!hasEglise || !hasDistrict || !hasFederation) {
    console.log('⚠️ Les colonnes manquent dans gl_data. Ajout en cours...');
    // Ajouter les colonnes manquantes (SQLite)
    if (!hasEglise) {
      await db.exec('ALTER TABLE gl_data ADD COLUMN eglise TEXT;');
      console.log('✅ Colonne eglise ajoutée à gl_data');
    }
    if (!hasDistrict) {
      await db.exec('ALTER TABLE gl_data ADD COLUMN district TEXT;');
      console.log('✅ Colonne district ajoutée à gl_data');
    }
    if (!hasFederation) {
      await db.exec('ALTER TABLE gl_data ADD COLUMN federation TEXT;');
      console.log('✅ Colonne federation ajoutée à gl_data');
    }
  }

  // ----------------------------------------
  // 2. Mettre à jour gl_data
  // ----------------------------------------
  const glResult = await db.run(`
    UPDATE gl_data
    SET eglise = (SELECT eglise FROM users WHERE id = gl_data.user_id),
        district = (SELECT district FROM users WHERE id = gl_data.user_id),
        federation = (SELECT federation FROM users WHERE id = gl_data.user_id)
    WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
  `);
  console.log(`✅ gl_data : ${glResult.changes} lignes mises à jour`);

  // ----------------------------------------
  // 3. Vérifier et ajouter les colonnes pour depenses
  // ----------------------------------------
  const tableInfoDep = await db.all("PRAGMA table_info(depenses)");
  const hasEgliseDep = tableInfoDep.some(col => col.name === 'eglise');
  const hasDistrictDep = tableInfoDep.some(col => col.name === 'district');
  const hasFederationDep = tableInfoDep.some(col => col.name === 'federation');

  if (!hasEgliseDep || !hasDistrictDep || !hasFederationDep) {
    console.log('⚠️ Les colonnes manquent dans depenses. Ajout en cours...');
    if (!hasEgliseDep) {
      await db.exec('ALTER TABLE depenses ADD COLUMN eglise TEXT;');
      console.log('✅ Colonne eglise ajoutée à depenses');
    }
    if (!hasDistrictDep) {
      await db.exec('ALTER TABLE depenses ADD COLUMN district TEXT;');
      console.log('✅ Colonne district ajoutée à depenses');
    }
    if (!hasFederationDep) {
      await db.exec('ALTER TABLE depenses ADD COLUMN federation TEXT;');
      console.log('✅ Colonne federation ajoutée à depenses');
    }
  }

  // ----------------------------------------
  // 4. Mettre à jour depenses
  // ----------------------------------------
  const depResult = await db.run(`
    UPDATE depenses
    SET eglise = (SELECT eglise FROM users WHERE id = depenses.user_id),
        district = (SELECT district FROM users WHERE id = depenses.user_id),
        federation = (SELECT federation FROM users WHERE id = depenses.user_id)
    WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
  `);
  console.log(`✅ depenses : ${depResult.changes} lignes mises à jour`);

  // ----------------------------------------
  // 5. Ajouter la colonne soraBolaLinesJson dans monthly_reports si elle n'existe pas
  // ----------------------------------------
  let columnExists = false;
  if (db.isPostgres) {
    // Pour PostgreSQL
    const result = await db.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_reports' AND column_name = 'soraBolaLinesJson'
    `);
    columnExists = !!result;
  } else {
    // Pour SQLite
    const tableInfoMr = await db.all("PRAGMA table_info(monthly_reports)");
    columnExists = tableInfoMr.some(col => col.name === 'soraBolaLinesJson');
  }

  if (!columnExists) {
    console.log('📝 Ajout de la colonne soraBolaLinesJson à monthly_reports...');
    await db.exec('ALTER TABLE monthly_reports ADD COLUMN soraBolaLinesJson TEXT;');
    console.log('✅ Colonne soraBolaLinesJson ajoutée avec succès.');
  } else {
    console.log('ℹ️ La colonne soraBolaLinesJson existe déjà dans monthly_reports.');
  }

  console.log('✅ Migration terminée avec succès !');
  await db.close();
}

migrate().catch(err => {
  console.error('❌ Erreur lors de la migration :', err);
});