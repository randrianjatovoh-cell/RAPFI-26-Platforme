const nodemailer = require('nodemailer');

const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

// Vérification des variables d'environnement
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn('⚠️ Les variables EMAIL_USER ou EMAIL_PASS ne sont pas définies.');
}

// ⚡ Configuration explicite de Gmail pour éviter les problèmes IPv6
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  // Certains environnements supportent family: 4 pour forcer IPv4
  // mais cela dépend du module 'net' sous-jacent.
  // On peut essayer d'ajouter : lookup: (hostname, options, callback) => { /* forcer IPv4 */ }
  // Cependant, la solution la plus fiable est de laisser nodemailer gérer.
  // En cas d'échec, on pourra utiliser un service alternatif.
});

// Vérification de la connexion SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Échec de la connexion au serveur Gmail :', error.message);
    if (error.response) console.error('   Réponse SMTP :', error.response);
  } else {
    console.log(`✅ Connexion SMTP réussie (expéditeur : ${process.env.EMAIL_USER})`);
  }
});

/**
 * Envoie un email de bienvenue
 */
async function sendWelcomeEmail(to, nom, email, plainPassword) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`⚠️ Envoi annulé (config manquante) pour ${to}`);
    return { success: false, error: 'Configuration email manquante' };
  }

  if (!to || !to.includes('@')) {
    console.warn(`⚠️ Adresse email invalide : ${to}`);
    return { success: false, error: 'Adresse email invalide' };
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
    return { success: true, info };
  } catch (error) {
    console.error(`❌ Échec de l'envoi d'email à ${to} :`, error.message);
    if (error.response) console.error('   Réponse SMTP :', error.response);
    throw error;
  }
}

module.exports = { sendWelcomeEmail };