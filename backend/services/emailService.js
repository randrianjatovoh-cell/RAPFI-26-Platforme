// backend/services/emailService.js
const nodemailer = require('nodemailer');

// Récupération de l'URL de la plateforme depuis les variables d'environnement
const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Envoie un email de bienvenue à un nouvel utilisateur
 * @param {string} to - Email du destinataire
 * @param {string} nom - Nom de l'utilisateur
 * @param {string} email - Email de l'utilisateur
 * @param {string} plainPassword - Mot de passe en clair
 */
async function sendWelcomeEmail(to, nom, email, plainPassword) {
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

  await transporter.sendMail({
    from: `"RAPFI EGLISE" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  });
}

module.exports = { sendWelcomeEmail };