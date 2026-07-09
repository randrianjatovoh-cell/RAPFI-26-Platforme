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
      <div className="absolute inset-0 bg-gradient-to-l from-plum/5 via-blush/5 to-transparent"></div>

      <style>{`
        /* ============================================================
           ANIMATIONS PRINCIPALES
           ============================================================ */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0deg) rotateY(0deg); }
          50% { transform: translateY(-6px) rotateX(2deg) rotateY(2deg); }
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
        @keyframes pulse-logo {
          0%, 100% { box-shadow: 0 0 20px rgba(205, 127, 110, 0.2), 0 0 40px rgba(205, 127, 110, 0.05); }
          50% { box-shadow: 0 0 30px rgba(205, 127, 110, 0.3), 0 0 60px rgba(205, 127, 110, 0.1); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-slow-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        
        /* ============================================================
           ANIMATIONS 3D DU LOGO
           ============================================================ */
        @keyframes float-3d {
          0%, 100% { 
            transform: translateY(0px) rotateX(0deg) rotateY(0deg) scale(1); 
          }
          25% { 
            transform: translateY(-12px) rotateX(8deg) rotateY(12deg) scale(1.02); 
          }
          50% { 
            transform: translateY(0px) rotateX(0deg) rotateY(-8deg) scale(0.98); 
          }
          75% { 
            transform: translateY(8px) rotateX(-6deg) rotateY(15deg) scale(1.01); 
          }
        }
        @keyframes rotate-3d {
          0% { transform: rotateY(0deg) rotateX(0deg); }
          25% { transform: rotateY(90deg) rotateX(5deg); }
          50% { transform: rotateY(180deg) rotateX(0deg); }
          75% { transform: rotateY(270deg) rotateX(-5deg); }
          100% { transform: rotateY(360deg) rotateX(0deg); }
        }
        @keyframes glow-pulse-3d {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(205, 127, 110, 0.15), 
                        0 0 40px rgba(205, 127, 110, 0.05),
                        inset 0 0 20px rgba(255,255,255,0.1);
          }
          50% { 
            box-shadow: 0 0 40px rgba(205, 127, 110, 0.3), 
                        0 0 80px rgba(205, 127, 110, 0.1),
                        inset 0 0 30px rgba(255,255,255,0.2);
          }
        }
        @keyframes ring-rotate-3d {
          0% { transform: rotateX(60deg) rotateZ(0deg); }
          100% { transform: rotateX(60deg) rotateZ(360deg); }
        }
        @keyframes ring-rotate-3d-reverse {
          0% { transform: rotateX(30deg) rotateZ(360deg); }
          100% { transform: rotateX(30deg) rotateZ(0deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        @keyframes shimmer-3d {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(200%) rotate(25deg); }
        }
        
        /* ============================================================
           CLASSES D'ANIMATION
           ============================================================ */
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .animate-fadeInUp { animation: fadeInUp 0.5s ease-out forwards; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-pulse-logo { animation: pulse-logo 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
        .animate-spin-slow-reverse { animation: spin-slow-reverse 15s linear infinite; }
        
        /* Animations 3D du logo */
        .animate-float-3d { animation: float-3d 4s ease-in-out infinite; }
        .animate-rotate-3d { animation: rotate-3d 8s ease-in-out infinite; }
        .animate-glow-3d { animation: glow-pulse-3d 3s ease-in-out infinite; }
        .animate-ring-3d { animation: ring-rotate-3d 12s linear infinite; }
        .animate-ring-3d-reverse { animation: ring-rotate-3d-reverse 15s linear infinite; }
        .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
        .animate-shimmer-3d { animation: shimmer-3d 3s ease-in-out infinite; }
        
        /* ============================================================
           STYLES DU LOGO 3D
           ============================================================ */
        .logo-3d-container {
          position: relative;
          width: 130px;
          height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 800px;
          transform-style: preserve-3d;
        }
        .logo-3d-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: float-3d 4s ease-in-out infinite;
        }
        .logo-3d-inner {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(145deg, #ffffff, #f5f0ed);
          box-shadow: 0 10px 40px rgba(0,0,0,0.12), inset 0 2px 4px rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
          animation: glow-pulse-3d 3s ease-in-out infinite;
          border: 3px solid rgba(205, 127, 110, 0.15);
        }
        .logo-3d-inner:hover {
          transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.05);
        }
        .logo-3d-image {
          width: 85px;
          height: 85px;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.12));
          position: relative;
          z-index: 10;
          animation: rotate-3d 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }
        .logo-3d-image:hover {
          animation-play-state: paused;
        }
        /* Anneaux 3D */
        .ring-3d {
          position: absolute;
          border-radius: 50%;
          border: 2px solid rgba(205, 127, 110, 0.15);
          animation: ring-rotate-3d 12s linear infinite;
          transform-style: preserve-3d;
          pointer-events: none;
        }
        .ring-3d-1 {
          inset: -6px;
          border-color: rgba(205, 127, 110, 0.2);
          animation-duration: 10s;
        }
        .ring-3d-2 {
          inset: -14px;
          border-color: rgba(205, 127, 110, 0.15);
          border-style: dashed;
          animation: ring-rotate-3d-reverse 15s linear infinite;
        }
        .ring-3d-3 {
          inset: -22px;
          border-color: rgba(205, 127, 110, 0.1);
          border-width: 1px;
          animation-duration: 20s;
        }
        .ring-3d-4 {
          inset: -30px;
          border-color: rgba(205, 127, 110, 0.06);
          border-width: 1px;
          border-style: dotted;
          animation: ring-rotate-3d-reverse 25s linear infinite;
        }
        /* Particules lumineuses 3D */
        .sparkle-3d {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(205, 127, 110, 0.6), rgba(205, 127, 110, 0.1));
          pointer-events: none;
          animation: sparkle 2s ease-in-out infinite;
        }
        .sparkle-3d:nth-child(1) { top: -5px; right: 15px; animation-delay: 0s; }
        .sparkle-3d:nth-child(2) { bottom: -5px; left: 15px; animation-delay: 0.7s; }
        .sparkle-3d:nth-child(3) { top: 20px; right: -10px; animation-delay: 1.4s; }
        .sparkle-3d:nth-child(4) { bottom: 20px; left: -10px; animation-delay: 0.3s; }
        .sparkle-3d:nth-child(5) { top: 50%; right: -15px; animation-delay: 0.9s; }
        .sparkle-3d:nth-child(6) { top: 50%; left: -15px; animation-delay: 1.7s; }
        /* Effet de brillance 3D */
        .shimmer-3d {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          overflow: hidden;
          pointer-events: none;
          opacity: 0.5;
        }
        .shimmer-3d::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.3) 45%,
            rgba(255,255,255,0.5) 50%,
            rgba(255,255,255,0.3) 55%,
            transparent 60%
          );
          animation: shimmer-3d 3s ease-in-out infinite;
        }
        
        /* ============================================================
           AUTRES STYLES
           ============================================================ */
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
        .glass-card {
          backdrop-filter: blur(16px);
          background: linear-gradient(145deg, rgba(255, 248, 245, 0.85), rgba(250, 235, 225, 0.75), rgba(245, 220, 210, 0.65));
          border: 1px solid rgba(255, 255, 255, 0.4);
          max-width: 600px;
          width: 100%;
          margin-right: 3rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .text-plum { color: #5e2e4a; }
        .text-charcoal { color: #36454f; }
        .text-blush { color: #e8b4a0; }
        
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
        .login-footer {
          text-align: center;
          width: 100%;
          border-top: 1px solid rgba(200, 180, 170, 0.3);
          padding-top: 0.75rem;
          margin-top: 0.25rem;
        }
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
          min-width: 160px;
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
          min-width: 180px;
          padding-left: 1.5rem;
        }
        .login-row .vertical-divider {
          width: 1px;
          background: linear-gradient(to bottom, transparent, rgba(200, 180, 170, 0.4), rgba(200, 180, 170, 0.6), rgba(200, 180, 170, 0.4), transparent);
          flex-shrink: 0;
          margin: 0 0.5rem;
        }
        .login-row .login-qr .qr-label {
          font-size: 11px;
          color: #36454f;
          opacity: 0.6;
          font-weight: 500;
          margin-bottom: 6px;
          text-align: center;
        }
        .login-row .login-text .form-label {
          font-size: 11px;
          color: #36454f;
          opacity: 0.7;
          font-weight: 500;
          margin-bottom: 8px;
          text-align: center;
        }
        .qr-wrapper {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          background: white;
          padding: 8px;
          border: 1px solid rgba(200, 180, 170, 0.2);
        }
        .qr-wrapper:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          border-color: rgba(205, 127, 110, 0.3);
        }
        .qr-image {
          width: 160px;
          height: 160px;
          object-fit: contain;
          display: block;
        }
        @media (max-width: 480px) {
          .glass-card { margin-right: 0; max-width: 95%; }
          .login-row { flex-direction: column; gap: 0.75rem; align-items: center; }
          .login-row .login-text { padding-right: 0; min-width: 100%; }
          .login-row .login-qr { padding-left: 0; min-width: 100%; }
          .login-row .vertical-divider {
            width: 80%;
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(200, 180, 170, 0.4), rgba(200, 180, 170, 0.6), rgba(200, 180, 170, 0.4), transparent);
            margin: 0.25rem 0;
          }
          .logo-3d-container { width: 100px; height: 100px; }
          .logo-3d-image { width: 65px; height: 65px; }
          .login-container { padding: 1.5rem 1rem; }
          .qr-image { width: 140px; height: 140px; }
          .ring-3d-1 { inset: -4px; }
          .ring-3d-2 { inset: -10px; }
          .ring-3d-3 { inset: -16px; }
          .ring-3d-4 { inset: -22px; }
        }
        @media (min-width: 481px) and (max-width: 768px) {
          .glass-card { margin-right: 1.5rem; }
          .qr-image { width: 140px; height: 140px; }
        }
      `}</style>

      <div className="glass-card rounded-2xl shadow-xl login-container animate-fadeInUp">
        {/* ============================================================
            LOGO 3D AVEC ANIMATIONS
            ============================================================ */}
        <div className="login-header">
          <div className="logo-3d-container">
            <div className="logo-3d-wrapper">
              {/* Anneaux 3D */}
              <div className="ring-3d ring-3d-1"></div>
              <div className="ring-3d ring-3d-2"></div>
              <div className="ring-3d ring-3d-3"></div>
              <div className="ring-3d ring-3d-4"></div>
              
              {/* Particules lumineuses */}
              <div className="sparkle-3d"></div>
              <div className="sparkle-3d"></div>
              <div className="sparkle-3d"></div>
              <div className="sparkle-3d"></div>
              <div className="sparkle-3d"></div>
              <div className="sparkle-3d"></div>
              
              {/* Logo principal 3D */}
              <div className="logo-3d-inner animate-glow-3d">
                <div className="shimmer-3d"></div>
                <img
                  src="/FINANCE.png"
                  alt="Finance"
                  className="logo-3d-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-3d-image flex items-center justify-center text-5xl';
                    fallback.style.cssText = 'position:relative;z-index:10;width:85px;height:85px;display:flex;align-items:center;justify-content:center;font-size:4rem;color:#5e2e4a;';
                    fallback.innerHTML = '<i class="fas fa-church"></i>';
                    parent.appendChild(fallback);
                  }}
                />
              </div>
            </div>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-plum tracking-tight">
            Gestion des Dîmes et Offrandes
          </h2>
        </div>

        {/* ============================================================
            FORMULAIRE + LIGNE VERTICALE + QR CODE
            ============================================================ */}
        <div className="login-row w-full">
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

          <div className="vertical-divider"></div>

          <div className="login-qr">
            <p className="qr-label">
              <i className="fas fa-qrcode mr-1 text-blush"></i>
              Scannez ce QR Code
            </p>
            <div className="qr-wrapper qr-hover">
              <img
                src="/QR_Code.png"
                alt="QR Code Login"
                className="qr-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <p className="text-[9px] text-charcoal/40 mt-2 text-center">
              pour demander Login
            </p>
          </div>
        </div>

        {/* SECTION BAS : COPYRIGHT - RH André */}
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