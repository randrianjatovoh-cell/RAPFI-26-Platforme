// backend/migrate.js
const { openDb } = require('./db');

async function migrate() {
  console.log('🔄 Début de la migration...');
  const db = await openDb();

  try {
    // ============================================================
    // 1. CRÉER LA TABLE VOLA_SISA_TEO_ALOHA
    // ============================================================
    console.log('📝 Création de la table vola_sisa_teo_aloha...');
    
    try {
      await db.exec(`
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
      
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_vola_sisa_month_eglise 
        ON vola_sisa_teo_aloha(month_id, eglise)
      `);
      
      console.log('✅ Table vola_sisa_teo_aloha créée avec succès');
    } catch (err) {
      console.log('ℹ️ La table vola_sisa_teo_aloha existe probablement déjà');
    }

    // ============================================================
    // 2. MIGRER LES DONNÉES EXISTANTES DE volaSisaTeoAloha
    //    DEPUIS monthly_reports VERS vola_sisa_teo_aloha
    // ============================================================
    console.log('📝 Migration des données volaSisaTeoAloha...');
    
    try {
      // Récupérer toutes les valeurs existantes dans monthly_reports
      const reports = await db.all(`
        SELECT month_id, eglise, volaSisaTeoAloha 
        FROM monthly_reports 
        WHERE volaSisaTeoAloha IS NOT NULL AND volaSisaTeoAloha > 0
      `);
      
      if (reports.length > 0) {
        console.log(`📊 ${reports.length} valeurs à migrer`);
        
        let migratedCount = 0;
        for (const report of reports) {
          try {
            // Vérifier si la valeur existe déjà dans la nouvelle table
            const existing = await db.get(`
              SELECT 1 FROM vola_sisa_teo_aloha 
              WHERE month_id = ? AND eglise = ?
            `, report.month_id, report.eglise);
            
            if (!existing) {
              // Insérer la valeur
              await db.run(`
                INSERT INTO vola_sisa_teo_aloha (month_id, eglise, amount, created_at, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, report.month_id, report.eglise, report.volaSisaTeoAloha);
              migratedCount++;
            }
          } catch (err) {
            console.warn(`⚠️ Erreur migration pour ${report.month_id} - ${report.eglise}:`, err.message);
          }
        }
        
        console.log(`✅ ${migratedCount} valeurs migrées vers vola_sisa_teo_aloha`);
      } else {
        console.log('ℹ️ Aucune donnée volaSisaTeoAloha à migrer');
      }
    } catch (err) {
      console.warn('⚠️ Erreur lors de la migration des données:', err.message);
    }

    // ============================================================
    // 3. METTRE À JOUR gl_data AVEC LES INFOS USER
    // ============================================================
    console.log('📝 Mise à jour des colonnes dans gl_data...');
    
    // Vérifier si les colonnes existent
    let tableInfo;
    try {
      tableInfo = await db.all("PRAGMA table_info(gl_data)");
    } catch (err) {
      // Pour PostgreSQL
      tableInfo = await db.all(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'gl_data'
      `);
    }
    
    const hasEglise = tableInfo.some(col => col.name === 'eglise' || col.column_name === 'eglise');
    const hasDistrict = tableInfo.some(col => col.name === 'district' || col.column_name === 'district');
    const hasFederation = tableInfo.some(col => col.name === 'federation' || col.column_name === 'federation');

    if (hasEglise && hasDistrict && hasFederation) {
      try {
        const glResult = await db.run(`
          UPDATE gl_data
          SET eglise = (SELECT eglise FROM users WHERE id = gl_data.user_id),
              district = (SELECT district FROM users WHERE id = gl_data.user_id),
              federation = (SELECT federation FROM users WHERE id = gl_data.user_id)
          WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
        `);
        console.log(`✅ gl_data : ${glResult.changes || 0} lignes mises à jour`);
      } catch (err) {
        console.warn('⚠️ Erreur mise à jour gl_data:', err.message);
      }
    } else {
      console.log('ℹ️ Colonnes manquantes dans gl_data, mise à jour ignorée');
    }

    // ============================================================
    // 4. METTRE À JOUR depenses AVEC LES INFOS USER
    // ============================================================
    console.log('📝 Mise à jour des colonnes dans depenses...');
    
    try {
      let depTableInfo;
      try {
        depTableInfo = await db.all("PRAGMA table_info(depenses)");
      } catch (err) {
        depTableInfo = await db.all(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'depenses'
        `);
      }
      
      const depHasEglise = depTableInfo.some(col => col.name === 'eglise' || col.column_name === 'eglise');
      const depHasDistrict = depTableInfo.some(col => col.name === 'district' || col.column_name === 'district');
      const depHasFederation = depTableInfo.some(col => col.name === 'federation' || col.column_name === 'federation');

      if (depHasEglise && depHasDistrict && depHasFederation) {
        const depResult = await db.run(`
          UPDATE depenses
          SET eglise = (SELECT eglise FROM users WHERE id = depenses.user_id),
              district = (SELECT district FROM users WHERE id = depenses.user_id),
              federation = (SELECT federation FROM users WHERE id = depenses.user_id)
          WHERE eglise IS NULL OR district IS NULL OR federation IS NULL
        `);
        console.log(`✅ depenses : ${depResult.changes || 0} lignes mises à jour`);
      } else {
        console.log('ℹ️ Colonnes manquantes dans depenses, mise à jour ignorée');
      }
    } catch (err) {
      console.warn('⚠️ Erreur mise à jour depenses:', err.message);
    }

    // ============================================================
    // 5. VÉRIFICATION FINALE
    // ============================================================
    console.log('📝 Vérification finale...');
    
    try {
      const count = await db.get('SELECT COUNT(*) as total FROM vola_sisa_teo_aloha');
      console.log(`✅ Table vola_sisa_teo_aloha : ${count.total} enregistrements`);
    } catch (err) {
      console.warn('⚠️ Erreur vérification:', err.message);
    }

    console.log('✅ Migration terminée avec succès !');
    
  } catch (err) {
    console.error('❌ Erreur lors de la migration :', err);
  } finally {
    await db.close();
  }
}

// Exécuter la migration
migrate();