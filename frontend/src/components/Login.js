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
      className="min-h-screen flex items-center justify-end py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/Login.png')` }}
    >
      {/* Overlay plus léger pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-l from-amber-900/30 via-orange-900/20 to-transparent backdrop-blur-[1px]"></div>

      {/* Cercles décoratifs animés (moins visibles) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-amber-300/10 rounded-full animate-spin-slow blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-rose-300/10 rounded-full animate-spin-slow blur-3xl" style={{ animationDirection: 'reverse' }}></div>
      </div>

      {/* Animations CSS (inchangées) */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-spin-slow {
          animation: spinSlow 20s linear infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .input-focus {
          transition: all 0.3s ease;
        }
        .input-focus:focus {
          transform: scale(1.02);
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2);
        }
        .btn-hover {
          transition: all 0.3s ease;
        }
        .btn-hover:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.5);
        }
        .btn-hover:active {
          transform: scale(0.98);
        }
        .qr-hover {
          transition: all 0.5s ease;
        }
        .qr-hover:hover {
          transform: scale(1.05) rotate(2deg);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .glass-card {
          backdrop-filter: blur(16px);
          background: rgba(255, 255, 255, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>

      {/* Conteneur décalé à droite avec un espace sur la gauche */}
      <div className="max-w-5xl w-full glass-card rounded-3xl shadow-2xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center justify-center relative z-10 animate-fadeInUp md:mr-8 lg:mr-16">
        {/* Colonne gauche : formulaire */}
        <div className="flex-1 w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-lg animate-float ring-4 ring-amber-200/50">
                <img
                  src="/FINANCE.png"
                  alt="Finance"
                  className="h-16 w-16 object-contain drop-shadow-md"
                />
              </div>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-800 tracking-tight">
              Gestion des Dîmes
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-shake">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-red-500"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-envelope text-amber-400 text-sm"></i>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white/90 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-150"
                    placeholder="exemple@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fas fa-lock text-amber-400 text-sm"></i>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-focus appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white/90 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-150"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-hover relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:via-orange-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg animate-pulse-glow"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2" />
                    Se connecter
                  </>
                )}
              </button>
            </div>

            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200/50">
              <p>© 2026 Gestion des Dîmes et Offrandes</p>
              <p className="mt-1">Système sécurisé - Tous droits réservés</p>
            </div>
          </form>
        </div>

        {/* Colonne droite : QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto md:border-l md:border-gray-200/50 md:pl-8 pt-8 md:pt-0">
          <p className="text-sm text-gray-700 font-medium mb-4 text-center">
            <i className="fas fa-qrcode mr-2 text-amber-500 animate-pulse"></i>
            Scannez ce QR Code pour demander Login
          </p>
          <div className="qr-hover rounded-xl overflow-hidden shadow-md bg-white p-2">
            <img
              src="/QR_Code.png"
              alt="QR Code Login"
              className="w-48 h-48 object-contain"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}