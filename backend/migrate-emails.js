// backend/migrate-emails.js
const { openDb } = require('./db');

/**
 * Ce script corrige les emails des églises existantes
 * pour les passer au format nom_eglise@rapfi.eg
 */
async function migrateEmails() {
  console.log('🔄 Migration des emails des églises...');
  const db = await openDb();

  try {
    // Récupérer toutes les églises (utilisateurs avec fonction 'Ancien' ou 'Trésorier')
    const churches = await db.all(`
      SELECT id, nom, eglise, email, fonction 
      FROM users 
      WHERE fonction IN ('Ancien', 'Trésorier') 
        AND eglise IS NOT NULL 
        AND eglise != ''
        AND email LIKE '%@rapfi.local'
    `);

    console.log(`📊 ${churches.length} églises à migrer`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const church of churches) {
      try {
        // Générer le nouveau email
        const emailPrefix = church.eglise
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
        
        let newEmail = `${emailPrefix}@rapfi.eg`;
        
        // Vérifier si le nouvel email existe déjà
        const existing = await db.get('SELECT 1 FROM users WHERE email = ? AND id != ?', newEmail, church.id);
        if (existing) {
          const timestamp = Date.now();
          newEmail = `${emailPrefix}_${timestamp}@rapfi.eg`;
          console.log(`⚠️ Email ${emailPrefix}@rapfi.eg déjà utilisé pour ${church.eglise}, utilisation de ${newEmail}`);
        }

        // Mettre à jour l'email
        await db.run('UPDATE users SET email = ? WHERE id = ?', newEmail, church.id);
        
        console.log(`✅ ${church.eglise}: ${church.email} → ${newEmail}`);
        migratedCount++;
        
      } catch (err) {
        console.error(`❌ Erreur pour ${church.eglise}:`, err.message);
        errorCount++;
      }
    }

    console.log(`✅ Migration terminée: ${migratedCount} églises mises à jour, ${errorCount} erreurs`);

  } catch (err) {
    console.error('❌ Erreur générale:', err);
  } finally {
    await db.close();
  }
}

// Exécuter la migration
migrateEmails();