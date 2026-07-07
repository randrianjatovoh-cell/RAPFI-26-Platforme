// src/components/Login.js
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

export default function Login({ onLogin }) {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      className="min-h-screen flex items-center justify-end py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{
        backgroundImage: `url('/Login.png')`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay très léger pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-l from-plum/10 via-blush/5 to-transparent"></div>

      {/* Animations CSS */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(205, 127, 110, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(205, 127, 110, 0); }
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
          backdrop-filter: blur(10px);
          background: rgba(255, 248, 245, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .text-plum { color: #5e2e4a; }
        .text-maroon { color: #6e2c2c; }
        .text-charcoal { color: #36454f; }
        .bg-blush { background: #f5d6cd; }
        .bg-peach { background: #fad4c0; }
        .bg-nude { background: #f2e3db; }
        .border-blush { border-color: #f5d6cd; }
        .from-blush { --tw-gradient-from: #f5d6cd; --tw-gradient-to: rgba(245,214,205,0); }
        .to-peach { --tw-gradient-to: #fad4c0; }
      `}</style>

      <div className="max-w-4xl w-full glass-card rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-center relative z-10 animate-fadeInUp md:mr-6 lg:mr-12">
        {/* Colonne gauche : formulaire */}
        <div className="flex-1 w-full max-w-sm mx-auto">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-white/90 shadow-lg flex items-center justify-center animate-float ring-2 ring-blush/40">
                <img
                  src="/FINANCE.png"
                  alt="Finance"
                  className="h-14 w-14 object-contain drop-shadow-sm"
                />
              </div>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-plum tracking-tight">
              Gestion des Dîmes
            </h2>
            <p className="mt-1 text-sm text-charcoal/80">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded-md animate-shake">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-0.5">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-envelope text-blush/70 text-sm"></i>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg placeholder-gray-400 text-charcoal bg-white/90 focus:ring-2 focus:ring-blush focus:border-transparent transition duration-150 text-sm"
                    placeholder="exemple@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-0.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-blush/70 text-sm"></i>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg placeholder-gray-400 text-charcoal bg-white/90 focus:ring-2 focus:ring-blush focus:border-transparent transition duration-150 text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-hover relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blush to-peach hover:from-blush/90 hover:to-peach/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blush transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2" />
                    Se connecter
                  </>
                )}
              </button>
            </div>

            <div className="text-center text-xs text-charcoal/60 pt-3 border-t border-gray-200/50">
              <p>© 2026 Gestion des Dîmes et Offrandes</p>
              <p className="mt-0.5">Système sécurisé - Tous droits réservés</p>
            </div>
          </form>
        </div>

        {/* Colonne droite : QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto md:border-l md:border-gray-200/50 md:pl-6 pt-6 md:pt-0">
          <p className="text-xs text-charcoal/70 font-medium mb-3 text-center">
            <i className="fas fa-qrcode mr-1.5 text-blush"></i>
            Scannez ce QR Code pour demander Login
          </p>
          <div className="qr-hover rounded-lg overflow-hidden shadow-sm bg-white/90 p-1.5">
            <img
              src="/QR_Code.png"
              alt="QR Code Login"
              className="w-40 h-40 object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}