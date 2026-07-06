const { openDb } = require('../db');

async function checkAndAddColumn() {
  const db = await openDb();
  let columnExists = false;

  if (db.isPostgres) {
    const result = await db.get(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_reports' AND column_name = 'soraBolaLinesJson'
    `);
    columnExists = !!result;
  } else {
    const tableInfo = await db.all("PRAGMA table_info(monthly_reports)");
    columnExists = tableInfo.some(col => col.name === 'soraBolaLinesJson');
  }

  if (!columnExists) {
    console.log('📝 Ajout de la colonne soraBolaLinesJson...');
    await db.exec('ALTER TABLE monthly_reports ADD COLUMN soraBolaLinesJson TEXT;');
    console.log('✅ Colonne ajoutée.');
  } else {
    console.log('ℹ️ La colonne soraBolaLinesJson existe déjà.');
  }

  await db.close();
}

checkAndAddColumn().catch(console.error);