// backend/migrate.js
const { openDb } = require('./db');

async function migrate() {
  console.log('🔄 Début de la migration des anciennes données...');
  const db = await openDb();

  // 1. Vérifier si les colonnes existent
  const tableInfo = await db.all("PRAGMA table_info(gl_data)");
  const hasEglise = tableInfo.some(col => col.name === 'eglise');
  const hasDistrict = tableInfo.some(col => col.name === 'district');
  const hasFederation = tableInfo.some(col => col.name === 'federation');

  if (!hasEglise || !hasDistrict || !hasFederation) {
    console.log('⚠️ Les colonnes manquent dans gl_data. Ajoutez-les d\'abord avec db.js');
    await db.close();
    return;
  }

  // 2. Mettre à jour gl_data
  const glResult = await db.run(`
    UPDATE gl_data
    SET eglise = (SELECT eglise FROM users WHERE id = gl_data.user_id),
        district = (SELECT district FROM users WHERE id = gl_data.user_id),
        federation = (SELECT federation FROM users WHERE id = gl_data.user_id)
    WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
  `);
  console.log(`✅ gl_data : ${glResult.changes} lignes mises à jour`);

  // 3. Mettre à jour depenses
  const depResult = await db.run(`
    UPDATE depenses
    SET eglise = (SELECT eglise FROM users WHERE id = depenses.user_id),
        district = (SELECT district FROM users WHERE id = depenses.user_id),
        federation = (SELECT federation FROM users WHERE id = depenses.user_id)
    WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
  `);
  console.log(`✅ depenses : ${depResult.changes} lignes mises à jour`);

  console.log('✅ Migration terminée avec succès !');
  await db.close();
}

migrate().catch(err => {
  console.error('❌ Erreur lors de la migration :', err);
});