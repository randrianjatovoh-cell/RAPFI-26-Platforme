// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { getAllUsers } = require('../models');

// ============================================================
// AUTHENTIFICATION JWT
// ============================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('❌ Erreur JWT :', err.message);
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
}

// ============================================================
// AUTORISATION PAR RÔLE (Admin uniquement)
// ============================================================
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.fonction)) {
      console.warn(`⛔ Accès refusé pour ${req.user.fonction} (attendu: ${roles.join(', ')})`);
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
}

// ============================================================
// CHECK ACCESS - LOGIQUE COMPLÈTE
// ============================================================
async function checkAccess(req, res, next) {
  const user = req.user;
  const eglise = req.params.eglise || req.body.eglise || req.query.eglise;
  
  // Si pas d'église spécifiée, on continue (accès global)
  if (!eglise) return next();

  // ADMIN : accès total
  if (user.fonction === 'Admin') return next();

  try {
    const users = await getAllUsers();
    const church = users.find(u => u.eglise === eglise);

    if (church) {
      // CAS PASTEUR : ACCÈS AU DISTRICT
      if (user.fonction === 'Pasteur') {
        if (church.district !== user.district) {
          return res.status(403).json({ 
            error: 'Accès interdit à cette église (district)' 
          });
        }
        return next();
      }
      
      // CAS VÉRIFICATEUR : ACCÈS À LA FÉDÉRATION
      if (user.fonction === 'Vérificateur') {
        if (church.federation !== user.federation) {
          return res.status(403).json({ 
            error: 'Accès interdit à cette église (fédération)' 
          });
        }
        return next();
      }
      
      // CAS ANCIEN / TRÉSORIER : ACCÈS À LEUR PROPRE ÉGLISE
      if (user.eglise !== eglise) {
        return res.status(403).json({ 
          error: 'Accès interdit à cette église' 
        });
      }
      return next();
    }

    // L'ÉGLISE N'EXISTE PAS : LE PASTEUR PEUT LA CRÉER
    if (user.fonction === 'Pasteur') {
      req.newEglise = true;  // Flag pour la création
      return next();
    }

    return res.status(404).json({ error: 'Église introuvable' });
    
  } catch (err) {
    console.error('Erreur dans checkAccess:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { authenticateToken, authorize, checkAccess };