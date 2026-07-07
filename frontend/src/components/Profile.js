// src/components/Profile.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

// Constantes pour les messages
const MESSAGES = {
  PHOTO_SUCCESS: 'Photo mise à jour avec succès !',
  PHOTO_ERROR: 'Erreur lors du téléchargement de la photo',
  PHOTO_INVALID_TYPE: 'Le fichier doit être une image',
  PHOTO_TOO_LARGE: 'La photo ne doit pas dépasser 5 Mo',
  PASSWORD_MISMATCH: 'Les mots de passe ne correspondent pas',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 4 caractères',
  PASSWORD_SUCCESS: 'Mot de passe modifié avec succès !',
  PASSWORD_ERROR: 'Erreur lors du changement de mot de passe',
  PASSWORD_ADMIN_FORBIDDEN: "Le mot de passe de l'administrateur ne peut pas être modifié.",
  CONTACT_SUCCESS: 'Adresse et contact mis à jour !',
  CONTACT_NO_CHANGE: 'Aucune modification détectée',
  CONTACT_ERROR: 'Erreur lors de la mise à jour des coordonnées',
  GENERIC_ERROR: 'Une erreur est survenue',
};

// Composant pour afficher un message stylisé avec animation
const StatusMessage = ({ message, type }) => {
  if (!message) return null;
  
  const typeMap = {
    success: 'from-green-400 to-green-500 border-green-300 text-green-800',
    error: 'from-red-400 to-red-500 border-red-300 text-red-800',
    info: 'from-blue-400 to-indigo-500 border-blue-300 text-blue-800',
  };
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
  };
  const classes = typeMap[type] || typeMap.info;
  const icon = iconMap[type] || iconMap.info;
  
  return (
    <div className={`mt-4 p-4 rounded-xl border bg-gradient-to-r ${classes} shadow-lg flex items-center animate-slideDown`} role="alert">
      <div className="bg-white/30 rounded-full p-2 mr-3">
        <i className={`fas ${icon} text-xl`} aria-hidden="true"></i>
      </div>
      <span className="font-medium">{message}</span>
    </div>
  );
};

// Composant principal
export default function Profile({ onClose }) {
  const { user, updateUser, refreshUser } = useUser();
  const [photo, setPhoto] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adresse, setAdresse] = useState('');
  const [contact, setContact] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isHoveringPhoto, setIsHoveringPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Initialisation des champs depuis user
  useEffect(() => {
    if (user) {
      console.log('📦 [Profile] Données utilisateur reçues :', user);
      setPhoto(user.photo || '');
      setAdresse(user.adresse || '');
      setContact(user.contact || '');
    } else {
      console.warn('⚠️ [Profile] Aucun utilisateur dans le contexte.');
    }
  }, [user]);

  // Nettoyage du message après un délai
  const clearMessageAfterDelay = useCallback((delay = 5000) => {
    const timer = setTimeout(() => setMessage(''), delay);
    return () => clearTimeout(timer);
  }, []);

  // Fonction pour afficher un message
  const showMessage = useCallback((msg, type = 'success', delay = 5000) => {
    setMessage(msg);
    setMessageType(type);
    clearMessageAfterDelay(delay);
  }, [clearMessageAfterDelay]);

  // Gestion du téléchargement de la photo
  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showMessage(MESSAGES.PHOTO_INVALID_TYPE, 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage(MESSAGES.PHOTO_TOO_LARGE, 'error');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const result = await api.uploadUserPhoto(user.id, formData);
      
      console.log('📸 [Profile] Réponse upload photo :', result);
      
      const photoUrl = result.photoUrl || result.url || result.photo || result;
      if (!photoUrl) {
        throw new Error('URL de la photo non reçue du serveur');
      }

      setPhoto(photoUrl);
      updateUser({ photo: photoUrl });
      
      if (refreshUser) {
        await refreshUser();
        console.log('🔄 [Profile] Utilisateur rafraîchi après upload photo');
      }

      showMessage(MESSAGES.PHOTO_SUCCESS, 'success', 3000);
    } catch (err) {
      console.error('❌ Erreur upload photo:', err);
      showMessage(`${MESSAGES.PHOTO_ERROR} : ${err.message || ''}`, 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [user, updateUser, refreshUser, showMessage]);

  // Gestion du changement de mot de passe
  const handlePasswordChange = useCallback(async (e) => {
    e.preventDefault();
    if (user?.fonction === 'Admin') {
      showMessage(MESSAGES.PASSWORD_ADMIN_FORBIDDEN, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage(MESSAGES.PASSWORD_MISMATCH, 'error');
      return;
    }
    if (newPassword.length < 4) {
      showMessage(MESSAGES.PASSWORD_TOO_SHORT, 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.updateUserPassword(user.id, newPassword);
      showMessage(MESSAGES.PASSWORD_SUCCESS, 'success', 3000);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('❌ Erreur changement mot de passe:', err);
      showMessage(`${MESSAGES.PASSWORD_ERROR} : ${err.message || ''}`, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  }, [user, newPassword, confirmPassword, showMessage]);

  // Gestion de l'enregistrement adresse/contact
  const handleSaveContact = useCallback(async () => {
    const originalAdresse = user?.adresse || '';
    const originalContact = user?.contact || '';
    if (adresse === originalAdresse && contact === originalContact) {
      showMessage(MESSAGES.CONTACT_NO_CHANGE, 'info', 3000);
      return;
    }

    setIsSavingContact(true);
    try {
      await api.updateUser(user.id, { adresse, contact });
      updateUser({ adresse, contact });
      
      if (refreshUser) {
        await refreshUser();
        console.log('🔄 [Profile] Utilisateur rafraîchi après mise à jour coordonnées');
      }

      showMessage(MESSAGES.CONTACT_SUCCESS, 'success', 3000);
    } catch (err) {
      console.error('❌ Erreur mise à jour coordonnées:', err);
      showMessage(`${MESSAGES.CONTACT_ERROR} : ${err.message || ''}`, 'error');
    } finally {
      setIsSavingContact(false);
    }
  }, [user, adresse, contact, updateUser, refreshUser, showMessage]);

  // Vérifier si les champs adresse/contact ont changé
  const hasContactChanged = user
    ? adresse !== (user.adresse || '') || contact !== (user.contact || '')
    : false;

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-2xl text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-500">Chargement du profil...</p>
      </div>
    );
  }

  const isAdmin = user.fonction === 'Admin';

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 bg-gradient-to-br from-white to-indigo-50/50 rounded-3xl shadow-2xl border border-indigo-100/30">
      {/* En-tête avec dégradé et bouton de fermeture */}
      <div className="relative mb-8">
        <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-2xl"></div>
        
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg">
              <i className="fas fa-user-circle text-white text-2xl"></i>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Mon profil
            </h2>
          </div>
          <button
            onClick={onClose}
            className="group w-10 h-10 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-all duration-300 flex items-center justify-center shadow-sm hover:shadow-md"
            aria-label="Fermer le profil"
          >
            <i className="fas fa-times text-gray-400 group-hover:text-red-500 transition-colors duration-300 text-lg"></i>
          </button>
        </div>
        <div className="h-0.5 w-20 bg-gradient-to-r from-indigo-500 to-purple-500 mt-3 rounded-full"></div>
      </div>

      {/* Photo de profil */}
      <section className="flex flex-col items-center mb-8" aria-label="Photo de profil">
        <div 
          className="relative group"
          onMouseEnter={() => setIsHoveringPhoto(true)}
          onMouseLeave={() => setIsHoveringPhoto(false)}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-500"></div>
          <div className="relative w-36 h-36 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center border-4 border-white shadow-2xl">
            {photo ? (
              <img
                src={photo}
                alt="Photo de profil"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => {
                  e.target.style.display = 'none';
                  const parent = e.target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<i class="fas fa-user-circle text-7xl text-gray-400" aria-hidden="true"></i>';
                  }
                }}
              />
            ) : (
              <i className="fas fa-user-circle text-7xl text-gray-400" aria-hidden="true"></i>
            )}
            {isHoveringPhoto && !isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300">
                <i className="fas fa-camera text-white text-3xl"></i>
              </div>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
        
        <label
          htmlFor="photo-upload"
          className={`mt-4 cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
            isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <i className="fas fa-camera" aria-hidden="true"></i>
          {isUploadingPhoto ? 'Téléchargement...' : 'Changer la photo'}
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handlePhotoChange}
          className="hidden"
          disabled={isUploadingPhoto}
          aria-disabled={isUploadingPhoto}
        />
      </section>

      {/* Informations personnelles */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" aria-label="Informations personnelles">
        <div className="col-span-2 md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-user text-indigo-500" aria-hidden="true"></i>
            Nom complet
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 font-medium text-gray-800 shadow-sm">
            {user.nom} {user.prenom}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-envelope text-indigo-500" aria-hidden="true"></i>
            Email
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 text-gray-800 shadow-sm">
            {user.email}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-briefcase text-indigo-500" aria-hidden="true"></i>
            Fonction
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 text-gray-800 shadow-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
              {user.fonction}
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-church text-indigo-500" aria-hidden="true"></i>
            Église
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 text-gray-800 shadow-sm">
            {user.eglise || 'Non renseigné'}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-map-marker-alt text-indigo-500" aria-hidden="true"></i>
            District
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 text-gray-800 shadow-sm">
            {user.district || 'Non renseigné'}
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
            <i className="fas fa-globe text-indigo-500" aria-hidden="true"></i>
            Fédération
          </label>
          <div className="p-3 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl border border-indigo-100/50 text-gray-800 shadow-sm">
            {user.federation || 'Non renseigné'}
          </div>
        </div>
      </section>

      {/* Modification adresse et contact */}
      <section className="mb-8 bg-gradient-to-br from-white to-indigo-50/30 rounded-2xl p-6 border border-indigo-100/50 shadow-lg" aria-label="Modifier les coordonnées">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-md">
            <i className="fas fa-address-card text-white text-lg" aria-hidden="true"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-800">Coordonnées</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="adresse-input" className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <i className="fas fa-home text-indigo-400" aria-hidden="true"></i>
              Adresse
            </label>
            <input
              id="adresse-input"
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white"
              placeholder="Entrez votre adresse"
              aria-describedby="contact-message"
            />
          </div>
          <div>
            <label htmlFor="contact-input" className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
              <i className="fas fa-phone text-indigo-400" aria-hidden="true"></i>
              Contact (téléphone)
            </label>
            <input
              id="contact-input"
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white"
              placeholder="Entrez votre numéro de téléphone"
              aria-describedby="contact-message"
            />
          </div>
          <button
            onClick={handleSaveContact}
            disabled={isSavingContact || !hasContactChanged}
            className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
              isSavingContact || !hasContactChanged
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
            }`}
            aria-live="polite"
          >
            {isSavingContact ? (
              <>
                <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Enregistrement...
              </>
            ) : (
              <>
                <i className="fas fa-save" aria-hidden="true"></i> Enregistrer adresse et contact
              </>
            )}
          </button>
        </div>
      </section>

      {/* Changement de mot de passe */}
      {!isAdmin && (
        <section className="mb-8 bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-6 border border-purple-100/50 shadow-lg" aria-label="Changer le mot de passe">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-xl shadow-md">
              <i className="fas fa-key text-white text-lg" aria-hidden="true"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-800">Changer le mot de passe</h3>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nouveau mot de passe <span className="text-xs text-gray-400">(min 4 caractères)</span>
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white"
                required
                minLength="4"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 bg-white/80 hover:bg-white"
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                isChangingPassword
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
              aria-live="polite"
            >
              {isChangingPassword ? (
                <>
                  <i className="fas fa-spinner fa-spin" aria-hidden="true"></i> Modification...
                </>
              ) : (
                <>
                  <i className="fas fa-key" aria-hidden="true"></i> Modifier le mot de passe
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* Affichage des messages */}
      <StatusMessage message={message} type={messageType} />

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}