const nodemailer = require('nodemailer');

// Récupération de l'URL de la plateforme depuis les variables d'environnement
const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Vérifier la présence des variables essentielles
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ Les variables EMAIL_USER ou EMAIL_PASS ne sont pas définies. L\'envoi d\'email est désactivé.');
}

// Création du transporteur avec des options de timeout
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Timeouts pour éviter les blocages
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
});

// Vérifier la configuration au démarrage (appelé une fois)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erreur de configuration du transporteur email :', error.message);
    if (error.response) console.error('   Réponse SMTP :', error.response);
  } else {
    console.log('✅ Transporteur email configuré avec succès (Gmail).');
  }
});

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param {string} to - Email du destinataire
 * @param {string} nom - Nom de l'utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} plainPassword - Mot de passe en clair
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail(to, nom, email, plainPassword) {
  // Si les variables d'environnement ne sont pas définies, on annule sans erreur
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`⚠️ Tentative d'envoi d'email à ${to} annulée (configuration manquante).`);
    return;
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
      <p>Ou copiez ce lien dans votre navigateur : <br> <a href="${platformUrl}">${platformUrl}</a></p>
      <p>Nous vous recommandons de changer votre mot de passe lors de votre première connexion.</p>
      <p style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
      <p style="text-align: center; color: #1a3c6e; font-weight: bold;">L'équipe RAPFI</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"RAPFI EGLISE" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email envoyé à ${to} (Message-ID: ${info.messageId})`);
  } catch (error) {
    console.error(`❌ Échec de l'envoi d'email à ${to} :`, error.message);
    if (error.response) {
      console.error('   Réponse du serveur SMTP :', error.response);
    }
    // On relance l'erreur pour que l'appelant (auth.js) puisse la loguer
    throw error;
  }
}

module.exports = { sendWelcomeEmail };