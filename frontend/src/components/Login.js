// frontend/src/components/Login.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

export default function Login({ onLogin }) {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔥 Nettoyer le mot de passe à chaque montage du composant
  useEffect(() => {
    setPassword('');
    setEmail('');
    setError('');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      if (onLogin) onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-end py-6 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        backgroundImage: `url('/Login.png')`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay très léger */}
      <div className="absolute inset-0 bg-gradient-to-l from-plum/5 via-blush/5 to-transparent"></div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
          50% { transform: translateY(-6px) rotateX(2deg) rotateY(2deg); }
          100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(205, 127, 110, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(205, 127, 110, 0); }
          100% { box-shadow: 0 0 0 0 rgba(205, 127, 110, 0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        @keyframes float-logo {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          25% { transform: translateY(-8px) rotate(-3deg) scale(1.03); }
          75% { transform: translateY(8px) rotate(3deg) scale(0.97); }
        }
        @keyframes pulse-logo {
          0%, 100% { box-shadow: 0 0 20px rgba(205, 127, 110, 0.2), 0 0 40px rgba(205, 127, 110, 0.05); }
          50% { box-shadow: 0 0 30px rgba(205, 127, 110, 0.3), 0 0 60px rgba(205, 127, 110, 0.1); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .animate-float-logo {
          animation: float-logo 3s ease-in-out infinite;
        }
        .animate-pulse-logo {
          animation: pulse-logo 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animate-spin-slow-reverse {
          animation: spin-slow 15s linear infinite reverse;
        }
        .input-focus {
          transition: all 0.25s ease;
        }
        .input-focus:focus {
          transform: scale(1.01);
          box-shadow: 0 0 0 3px rgba(205, 127, 110, 0.25);
        }
        .btn-hover {
          transition: all 0.25s ease;
        }
        .btn-hover:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 20px -4px rgba(205, 127, 110, 0.4);
        }
        .btn-hover:active {
          transform: scale(0.97);
        }
        .qr-hover {
          transition: all 0.4s ease;
        }
        .qr-hover:hover {
          transform: scale(1.04) rotate(1deg);
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
        }
        /* Conteneur avec dégradé et transparence - décalé à droite */
        .glass-card {
          backdrop-filter: blur(16px);
          background: linear-gradient(145deg, rgba(255, 248, 245, 0.85), rgba(250, 235, 225, 0.75), rgba(245, 220, 210, 0.65));
          border: 1px solid rgba(255, 255, 255, 0.4);
          max-width: 560px;
          width: 100%;
          margin-right: 3rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        /* Logo 3D avec perspective - AMÉLIORÉ POUR LA VISIBILITÉ */
        .logo-container {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        /* Cercle extérieur avec fond blanc pour faire ressortir le logo */
        .logo-circle-bg {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: white;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.8);
          border: 3px solid rgba(205, 127, 110, 0.15);
        }
        .logo-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 3px solid rgba(205, 127, 110, 0.2);
          animation: spin-slow 10s linear infinite;
        }
        .logo-ring-2 {
          position: absolute;
          inset: -16px;
          border-radius: 50%;
          border: 2px dashed rgba(205, 127, 110, 0.15);
          animation: spin-slow 15s linear infinite reverse;
        }
        .logo-ring-3 {
          position: absolute;
          inset: -24px;
          border-radius: 50%;
          border: 1px solid rgba(205, 127, 110, 0.08);
          animation: spin-slow 20s linear infinite;
        }
        .logo-glow {
          position: absolute;
          inset: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(205, 127, 110, 0.08) 0%, transparent 70%);
          animation: pulse-logo 3s ease-in-out infinite;
        }
        /* Le logo lui-même - bien visible */
        .logo-image {
          width: 80px;
          height: 80px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
          position: relative;
          z-index: 10;
        }
        .text-plum { color: #5e2e4a; }
        .text-charcoal { color: #36454f; }
        .text-blush { color: #e8b4a0; }
        .text-maroon { color: #6e2c2c; }
        .bg-blush { background: #f5d6cd; }
        .bg-peach { background: #fad4c0; }
        .bg-nude { background: #f2e3db; }
        .border-blush { border-color: #f5d6cd; }
        .from-blush { --tw-gradient-from: #e8b4a0; --tw-gradient-to: rgba(232,180,160,0); }
        .to-peach { --tw-gradient-to: #fad4c0; }
        
        /* Nouveaux styles pour la mise en page */
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          padding: 2.5rem 2rem;
        }
        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .login-form {
          width: 100%;
          max-width: 280px;
        }
        .login-footer {
          text-align: center;
          width: 100%;
          border-top: 1px solid rgba(200, 180, 170, 0.3);
          padding-top: 0.75rem;
          margin-top: 0.25rem;
        }
        /* Ligne avec Connectez-vous + QR Code sur la même ligne */
        .login-row {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: center;
          gap: 0;
          width: 100%;
          position: relative;
        }
        .login-row .login-text {
          flex: 1;
          min-width: 150px;
          display: flex;
          flex-direction: column;
          padding-right: 1.5rem;
        }
        .login-row .login-qr {
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 130px;
          padding-left: 1.5rem;
        }
        /* Ligne verticale de séparation */
        .login-row .vertical-divider {
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(200, 180, 170, 0.4), rgba(200, 180, 170, 0.6), rgba(200, 180, 170, 0.4), transparent);
          flex-shrink: 0;
          margin: 0 0.5rem;
        }
        .login-row .login-qr .qr-label {
          font-size: 10px;
          color: #36454f;
          opacity: 0.6;
          font-weight: 500;
          margin-bottom: 4px;
          text-align: center;
        }
        .login-row .login-text .form-label {
          font-size: 10px;
          color: #36454f;
          opacity: 0.7;
          font-weight: 500;
          margin-bottom: 8px;
          text-align: center;
        }
        @media (max-width: 480px) {
          .glass-card {
            margin-right: 0;
            max-width: 95%;
          }
          .login-row {
            flex-direction: column;
            gap: 0.75rem;
            align-items: center;
          }
          .login-row .login-text {
            padding-right: 0;
          }
          .login-row .login-qr {
            padding-left: 0;
          }
          .login-row .vertical-divider {
            width: 80%;
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(200, 180, 170, 0.4), rgba(200, 180, 170, 0.6), rgba(200, 180, 170, 0.4), transparent);
            margin: 0.25rem 0;
          }
          .logo-container {
            width: 90px;
            height: 90px;
          }
          .logo-image {
            width: 60px;
            height: 60px;
          }
          .login-container {
            padding: 1.5rem 1rem;
          }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .glass-card {
            margin-right: 1.5rem;
          }
        }
      `}</style>

      <div className="glass-card rounded-2xl shadow-xl login-container animate-fadeInUp">
        {/* ============================================================
            SECTION HAUT : LOGO + TITRE
            ============================================================ */}
        <div className="login-header">
          <div className="logo-container animate-pulse-logo">
            {/* Effets décoratifs */}
            <div className="logo-glow"></div>
            <div className="logo-ring"></div>
            <div className="logo-ring-2"></div>
            <div className="logo-ring-3"></div>
            
            {/* Fond blanc pour le logo */}
            <div className="logo-circle-bg"></div>
            
            {/* Le logo FINANCE.png */}
            <img
              src="/FINANCE.png"
              alt="Finance"
              className="logo-image animate-float-logo"
              style={{
                position: 'relative',
                zIndex: 10,
              }}
              onError={(e) => {
                // Fallback si l'image ne charge pas
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                const fallback = document.createElement('div');
                fallback.className = 'logo-image flex items-center justify-center text-4xl';
                fallback.style.cssText = 'position:relative;z-index:10;width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:3rem;color:#5e2e4a;';
                fallback.innerHTML = '<i class="fas fa-church"></i>';
                parent.appendChild(fallback);
              }}
            />
          </div>
          <h2 className="mt-3 text-2xl font-bold text-plum tracking-tight">
            Gestion des Dîmes et Offrandes
          </h2>
        </div>

        {/* ============================================================
            SECTION MILIEU : FORMULAIRE + LIGNE VERTICALE + QR CODE
            ============================================================ */}
        <div className="login-row w-full">
          {/* Colonne gauche : Formulaire */}
          <div className="login-text">
            <p className="form-label">
              <i className="fas fa-user-circle mr-1 text-blush"></i>
              Connectez-vous
            </p>

            <form className="space-y-3" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-2 rounded-md animate-shake">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <i className="fas fa-exclamation-circle text-red-500 text-xs"></i>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-medium text-charcoal mb-0.5">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-envelope text-blush/70 text-xs"></i>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg placeholder-gray-400 text-charcoal bg-white/90 focus:ring-2 focus:ring-blush focus:border-transparent transition duration-150 text-xs"
                    placeholder="exemple@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-charcoal mb-0.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-blush/70 text-xs"></i>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg placeholder-gray-400 text-charcoal bg-white/90 focus:ring-2 focus:ring-blush focus:border-transparent transition duration-150 text-xs"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-hover relative w-full flex justify-center py-2 px-4 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-blush to-peach hover:from-blush/90 hover:to-peach/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blush transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-1.5 text-xs"></i>
                    Se connecter
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Ligne verticale de séparation */}
          <div className="vertical-divider"></div>

          {/* Colonne droite : QR Code */}
          <div className="login-qr">
            <p className="qr-label">
              <i className="fas fa-qrcode mr-1 text-blush"></i>
              Scannez ce QR Code
            </p>
            <div className="qr-hover rounded-lg overflow-hidden shadow-md bg-white/95 p-2 border border-gray-100">
              <img
                src="/QR_Code.png"
                alt="QR Code Login"
                className="w-28 h-28 object-contain"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"%3E%3Crect width="112" height="112" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="10" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <p className="text-[9px] text-charcoal/40 mt-1 text-center">
              pour demander Login
            </p>
          </div>
        </div>

        {/* ============================================================
            SECTION BAS : COPYRIGHT - RH André
            ============================================================ */}
        <div className="login-footer">
          <p className="text-[10px] text-charcoal/50">
            © 2026 Gestion des Dîmes et Offrandes
          </p>
          <p className="text-[9px] text-charcoal/40 mt-0.5">
            RH André - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}