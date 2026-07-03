const mailjet = require('node-mailjet');

const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

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
      <h1 style="color: #1a3c6e; font-size: 20px; text-align: center;">Bonjour ${nom},</h1>
      <p>Nous vous informons qu’un compte a été créé sur la plateforme RAPFI EGLISE.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p><strong>Identifiant :</strong> ${email}</p>
        <p><strong>Mot de passe temporaire :</strong> ${plainPassword}</p>
      </div>
      <p>Vous pouvez vous connecter dès maintenant en cliquant sur le bouton ci-dessous :</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${platformUrl}" style="background-color: #1a3c6e; color: #ffffff; padding: 10px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Accéder à la plateforme
        </a>
      </div>
      <p style="font-size: 13px;">Pour des raisons de sécurité, nous vous conseillons de modifier ce mot de passe lors de votre première connexion.</p>
      <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px;">
        RAPFI EGLISE – Ambohidava, Antananarivo, Madagascar<br>
        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
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
            Headers: {
              'List-Unsubscribe': `<mailto:${process.env.MAILJET_FROM_EMAIL || 'plateformerapfi@gmail.com'}?subject=unsubscribe>`,
              'X-Mailjet-TrackOpen': '1',
              'X-Mailjet-TrackClick': '1',
            },
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