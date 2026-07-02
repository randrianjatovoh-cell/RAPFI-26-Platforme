const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

const platformUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const provider = process.env.EMAIL_PROVIDER || 'sendgrid'; // 'gmail' ou 'sendgrid'

let transporter = null;
let sendgridConfigured = false;

// Configuration du provider
if (provider === 'gmail') {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Variables EMAIL_USER ou EMAIL_PASS non définies pour Gmail.');
  } else {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Échec de la connexion au serveur Gmail :', error.message);
      } else {
        console.log(`✅ Connexion SMTP Gmail réussie (expéditeur : ${process.env.EMAIL_USER})`);
      }
    });
  }
} else if (provider === 'sendgrid') {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY non définie. L\'envoi d\'email avec SendGrid est désactivé.');
  } else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridConfigured = true;
    console.log(`✅ SendGrid configuré avec succès (from: ${process.env.SENDGRID_FROM_EMAIL || 'non défini'})`);
  }
} else {
  console.warn(`⚠️ Provider ${provider} non reconnu. Utilisation de SendGrid par défaut.`);
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridConfigured = true;
    console.log('✅ SendGrid configuré avec succès.');
  }
}

/**
 * Envoie un email de bienvenue
 */
async function sendWelcomeEmail(to, nom, email, plainPassword) {
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
    if (provider === 'gmail' && transporter) {
      const info = await transporter.sendMail({
        from: `"RAPFI EGLISE" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`✅ Email envoyé via Gmail à ${to} (Message-ID: ${info.messageId})`);
      return { success: true, info };
    } else if (provider === 'sendgrid' && sendgridConfigured) {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || 'plateformerapfi@gmail.com';
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
      };
      await sgMail.send(msg);
      console.log(`✅ Email envoyé via SendGrid à ${to}`);
      return { success: true };
    } else {
      // Fallback : on simule l'envoi pour éviter de bloquer
      console.warn(`⚠️ Aucun service d'email configuré. Envoi simulé à ${to}`);
      console.log(`🔹 Simulated email to ${to}:\n${html}`);
      return { success: false, error: 'Aucun service email configuré' };
    }
  } catch (error) {
    console.error(`❌ Échec de l'envoi d'email à ${to} :`, error.message);
    if (error.response) console.error('   Réponse :', error.response);
    throw error;
  }
}

module.exports = { sendWelcomeEmail };