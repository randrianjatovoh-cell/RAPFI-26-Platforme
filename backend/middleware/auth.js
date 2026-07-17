// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { getAllUsers } = require('../models');

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

async function checkAccess(req, res, next) {
  const user = req.user;
  const eglise = req.params.eglise || req.body.eglise || req.query.eglise;
  
  if (!eglise) return next();

  if (user.fonction === 'Admin') return next();

  try {
    const users = await getAllUsers();
    const church = users.find(u => u.eglise === eglise);

    if (church) {
      if (user.fonction === 'Pasteur') {
        if (church.district !== user.district) {
          return res.status(403).json({ 
            error: 'Accès interdit à cette église (district)' 
          });
        }
        return next();
      }
      
      if (user.fonction === 'Vérificateur') {
        if (church.federation !== user.federation) {
          return res.status(403).json({ 
            error: 'Accès interdit à cette église (fédération)' 
          });
        }
        return next();
      }
      
      if (user.eglise !== eglise) {
        return res.status(403).json({ 
          error: 'Accès interdit à cette église' 
        });
      }
      return next();
    }

    if (user.fonction === 'Pasteur') {
      req.newEglise = true;
      return next();
    }

    return res.status(404).json({ error: 'Église introuvable' });
    
  } catch (err) {
    console.error('Erreur dans checkAccess:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { authenticateToken, authorize, checkAccess };