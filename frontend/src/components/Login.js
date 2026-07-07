// src/components/Login.js
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';

export default function Login({ onLogin }) {
  const { login } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const emailInputRef = useRef(null);

  // Auto-focus sur le champ email
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
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
      setLoading(false);
    } finally {
      // Le loading sera arrêté dans le catch ou après redirection
    }
  };

  // Gestion du bouton "Afficher le mot de passe"
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      {/* Animations des cercles flottants en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-gradient-to-r from-amber-300 to-orange-400 rounded-full opacity-20 animate-float-slow"></div>
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-gradient-to-r from-pink-300 to-rose-400 rounded-full opacity-20 animate-float-medium"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-r from-blue-300 to-indigo-400 rounded-full opacity-20 animate-float-fast"></div>
        <div className="absolute top-2/3 left-10 w-48 h-48 bg-gradient-to-r from-green-300 to-teal-400 rounded-full opacity-10 animate-float-slow"></div>
        <div className="absolute top-10 right-1/4 w-56 h-56 bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full opacity-10 animate-float-medium"></div>
      </div>

      {/* Carte principale */}
      <div className="max-w-6xl w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 flex flex-col md:flex-row gap-8 items-center justify-center relative z-10 animate-fadeInUp">
        {/* Colonne gauche : formulaire */}
        <div className="flex-1 w-full max-w-md mx-auto animate-slideInLeft">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                <img
                  src="/FINANCE.png"
                  alt="Finance"
                  className="relative h-24 w-24 object-contain rounded-full shadow-lg ring-4 ring-amber-500/30 hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Gestion des Dîmes et Offrandes
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm animate-shake">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-circle text-red-500 text-lg"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Champ Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                  Adresse email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-amber-500">
                    <i className="fas fa-envelope text-gray-400 group-focus-within:text-amber-500"></i>
                  </div>
                  <input
                    id="email"
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-3 border-2 border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 group-hover:border-amber-300"
                    placeholder="exemple@email.com"
                  />
                  <div className="absolute inset-0 pointer-events-none rounded-xl ring-2 ring-transparent transition-all duration-200 group-focus-within:ring-amber-500/20"></div>
                </div>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                  Mot de passe
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200 group-focus-within:text-amber-500">
                    <i className="fas fa-lock text-gray-400 group-focus-within:text-amber-500"></i>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="appearance-none block w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 group-hover:border-amber-300"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-amber-500 transition-colors duration-200"
                    aria-label="Afficher le mot de passe"
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                  <div className="absolute inset-0 pointer-events-none rounded-xl ring-2 ring-transparent transition-all duration-200 group-focus-within:ring-amber-500/20"></div>
                </div>
              </div>
            </div>

            {/* Bouton de connexion avec effet ripple */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:via-orange-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundSize: '200% 200%',
                  animation: 'gradientMove 4s ease infinite',
                }}
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
                    <i className="fas fa-sign-in-alt mr-2 group-hover:animate-bounce"></i>
                    Se connecter
                  </>
                )}
              </button>
            </div>

            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200/50">
              <p>© 2026 Gestion des Dîmes et Offrandes</p>
              <p className="mt-1">Système sécurisé - Tous droits réservés à RH André</p>
            </div>
          </form>
        </div>

        {/* Colonne droite : QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto md:border-l md:border-gray-200/50 md:pl-8 pt-8 md:pt-0 animate-slideInRight">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative bg-white/90 p-6 rounded-2xl shadow-xl border border-gray-200/50 backdrop-blur-sm transform transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 group-hover:shadow-2xl">
              <p className="text-sm text-gray-700 font-medium mb-4 text-center">
                <i className="fas fa-qrcode mr-2 text-amber-500 animate-pulse"></i>
                Scannez ce QR Code pour demander Login
              </p>
              <img
                src="/QR_Code.png"
                alt="QR Code Login"
                className="w-48 h-48 object-contain rounded-lg shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
                }}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-400 opacity-50">QR v1.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Styles globaux pour les animations et keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        @keyframes float-slow {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-medium {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 30px) scale(1.2); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes float-fast {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 10px) scale(1.3); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.8s ease-out forwards;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: float-medium 10s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: float-fast 8s ease-in-out infinite;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        /* Pour le bouton */
        .hover\\:animate-bounce:hover {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  );
}