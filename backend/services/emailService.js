const mailjet = require('node-mailjet');

const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configuration Mailjet (API v3.1)
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY,
  { options: { version: 'v3.1' } }
);

async function sendWelcomeEmail(to, nom, email, plainPassword) {
  if (!to || !to.includes('@')) {
    console.warn(`⚠️ Adresse email invalide : ${to}`);
    return { success: false, error: 'Adresse email invalide' };
  }

  // Si les clés Mailjet ne sont pas définies, on passe en mode fichier
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
    console.warn('⚠️ Clés Mailjet non définies, passage en mode fichier.');
    const fs = require('fs');
    const path = require('path');
    const logEntry = `
[${new Date().toISOString()}] Email à envoyer à ${to}
Nom: ${nom}
Email: ${email}
Mot de passe: ${plainPassword}
---\n`;
    const logFile = path.join(__dirname, '../emails.log');
    fs.appendFileSync(logFile, logEntry);
    console.log(`📝 Email enregistré dans le fichier (${to})`);
    return { success: true, logged: true };
  }

  const subject = 'Bienvenue sur la plateforme RAPFI EGLISE';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h1 style="color: #1a3c6e; text-align: center;">Bienvenue ${nom} !</h1>
      <p>Votre compte a été créé avec succès sur la plateforme de gestion des dîmes et offrandes <strong>RAPFI EGLISE</strong>.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Mot de passe :</strong> ${plainPassword}</p>
      </div>
      <p>Pour vous connecter, cliquez sur le lien ci-dessous :</p>
      <p style="text-align: center; margin: 25px 0;">
        <a href="${platformUrl}" style="background-color: #1a3c6e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Accéder à la plateforme
        </a>
      </p>
      <p>Nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
      <p style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
      <p style="text-align: center; color: #1a3c6e; font-weight: bold;">L'équipe RAPFI</p>
    </div>
  `;

  try {
    const request = mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM_EMAIL || 'plateformerapfi@gmail.com',
              Name: 'RAPFI EGLISE',
            },
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });

    const response = await request;
    console.log(`✅ Email envoyé via Mailjet à ${to}`);
    return { success: true, response };
  } catch (error) {
    console.error(`❌ Échec Mailjet :`, error.message);
    if (error.response) {
      console.error('   Statut :', error.response.status);
      console.error('   Message :', error.response.data);
    }
    // Fallback mode fichier
    console.warn(`📝 Fallback : enregistrement de l'email dans le fichier pour ${to}`);
    const fs = require('fs');
    const path = require('path');
    const logEntry = `
[${new Date().toISOString()}] Email à envoyer à ${to} (après échec Mailjet)
Nom: ${nom}
Email: ${email}
Mot de passe: ${plainPassword}
---\n`;
    const logFile = path.join(__dirname, '../emails.log');
    fs.appendFileSync(logFile, logEntry);
    return { success: true, logged: true };
  }
}

module.exports = { sendWelcomeEmail };