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
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const emailInputRef = useRef(null);

  // Charger l'email sauvegardé
  useEffect(() => {
    const savedEmail = localStorage.getItem('loginEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedEmail));
    }
    emailInputRef.current?.focus();
  }, []);

  // Validation en temps réel
  useEffect(() => {
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    setPasswordValid(password.length >= 4); // Mot de passe minimum 4 caractères
  }, [email, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation côté client
    if (!emailValid) {
      setError('Veuillez entrer une adresse email valide.');
      emailInputRef.current?.focus();
      return;
    }
    if (!passwordValid) {
      setError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    setLoading(true);

    try {
      const data = await login(email, password);
      // Sauvegarder l'email pour la prochaine connexion
      localStorage.setItem('loginEmail', email);
      if (onLogin) onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Identifiant ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url('/Login.png')` }}
    >
      <div className="max-w-5xl w-full bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-white/20 flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Colonne gauche : formulaire */}
        <div className="flex-1 w-full max-w-md mx-auto">
          <div className="text-center">
            <div className="flex justify-center">
              <img
                src="/FINANCE.png"
                alt="Logo Gestion des Dîmes et Offrandes"
                className="h-20 w-20 object-contain rounded-full shadow-lg ring-2 ring-amber-500/30"
              />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-800">
              Gestion des Dîmes et Offrandes
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-shake" role="alert">
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
              {/* Champ Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className={`fas fa-envelope ${emailValid ? 'text-green-500' : 'text-amber-400'}`}></i>
                  </div>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-describedby="email-error"
                    className={`appearance-none block w-full pl-10 pr-3 py-3 border ${emailValid ? 'border-green-500' : 'border-gray-300'} rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-150 bg-white/80`}
                    placeholder="exemple@email.com"
                    autoComplete="username"
                  />
                  {emailValid && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <i className="fas fa-check-circle text-green-500"></i>
                    </div>
                  )}
                </div>
                <p id="email-error" className="mt-1 text-xs text-gray-500">
                  Entrez votre adresse email institutionnelle.
                </p>
              </div>

              {/* Champ Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className={`fas fa-lock ${passwordValid ? 'text-green-500' : 'text-amber-400'}`}></i>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-describedby="password-hint"
                    className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-150 bg-white/80"
                    placeholder="••••••••"
                    minLength={4}
                    autoComplete="current-password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={toggleShowPassword}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-full p-1"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <p id="password-hint" className="mt-1 text-xs text-gray-500">
                  Minimum 4 caractères.
                </p>
              </div>
            </div>

            {/* Options supplémentaires */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-amber-600 hover:text-amber-500">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !emailValid || !passwordValid}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-700 hover:via-orange-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

            <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
              <p>© 2026 Gestion des Dîmes et Offrandes</p>
              <p className="mt-1">Système sécurisé - Tous droits réservés à RH André</p>
            </div>
          </form>
        </div>

        {/* Colonne droite : QR Code */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs mx-auto md:border-l md:border-gray-200 md:pl-8 pt-8 md:pt-0">
          <p className="text-sm text-gray-700 font-medium mb-4 text-center">
            <i className="fas fa-qrcode mr-2 text-amber-500"></i>
            Scannez ce QR Code pour demander Login
          </p>
          <img
            src="/QR_Code.png"
            alt="QR Code pour demander un identifiant de connexion"
            className="w-48 h-48 object-contain border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%239ca3af" text-anchor="middle" dy=".3em"%3EQR Code%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}