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

// Composant pour afficher un message stylisé
const StatusMessage = ({ message, type }) => {
  if (!message) return null;
  const typeMap = {
    success: 'bg-green-50 border-green-400 text-green-700',
    error: 'bg-red-50 border-red-400 text-red-700',
    info: 'bg-blue-50 border-blue-400 text-blue-700',
  };
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-exclamation-circle',
    info: 'fa-info-circle',
  };
  const classes = typeMap[type] || typeMap.info;
  const icon = iconMap[type] || iconMap.info;
  return (
    <div className={`mt-4 p-3 rounded border ${classes} flex items-center`} role="alert">
      <i className={`fas ${icon} mr-2`} aria-hidden="true"></i>
      <span>{message}</span>
    </div>
  );
};

// Composant principal
export default function Profile({ onClose }) {
  const { user, updateUser, refreshUser } = useUser(); // ← ajout de refreshUser
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
  const fileInputRef = useRef(null);

  // Initialisation des champs depuis user (et mise à jour si user change)
  useEffect(() => {
    if (user) {
      console.log('📦 [Profile] Données utilisateur reçues :', user);
      // Vérifier si les champs existent
      const hasPhoto = !!user.photo;
      const hasAdresse = !!user.adresse;
      const hasContact = !!user.contact;
      console.log(`📦 [Profile] Champs : photo=${hasPhoto}, adresse=${hasAdresse}, contact=${hasContact}`);

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

  // Fonction pour afficher un message d'erreur ou succès
  const showMessage = useCallback((msg, type = 'success', delay = 5000) => {
    setMessage(msg);
    setMessageType(type);
    clearMessageAfterDelay(delay);
  }, [clearMessageAfterDelay]);

  // Gestion du téléchargement de la photo
  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation du fichier
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
      
      // Vérifier la structure de la réponse
      const photoUrl = result.photoUrl || result.url || result.photo || result;
      if (!photoUrl) {
        throw new Error('URL de la photo non reçue du serveur');
      }

      setPhoto(photoUrl);
      // Mettre à jour le contexte avec la nouvelle photo
      updateUser({ photo: photoUrl });
      
      // Optionnel : rafraîchir tout l'utilisateur pour être sûr
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
        fileInputRef.current.value = ''; // Réinitialiser l'input
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

  // Si user est null ou undefined, on affiche un message de chargement
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl text-center">
        <p className="text-gray-500">Chargement du profil...</p>
      </div>
    );
  }

  const isAdmin = user.fonction === 'Admin';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      {/* En-tête avec bouton de fermeture */}
      <div className="flex items-center mb-6 relative border-b pb-4">
        <h2 className="text-2xl font-bold flex-1 text-center text-indigo-700">
          <i className="fas fa-user-circle mr-2" aria-hidden="true"></i>
          Mon profil
        </h2>
        <button
          onClick={onClose}
          className="absolute right-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label="Fermer le profil"
        >
          <i className="fas fa-times text-xl" aria-hidden="true"></i>
        </button>
      </div>

      {/* Photo de profil */}
      <section className="flex flex-col items-center mb-6" aria-label="Photo de profil">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-3 border-4 border-indigo-100 shadow-md">
          {photo ? (
            <img
              src={photo}
              alt="Photo de profil"
              className="w-full h-full object-cover"
              onError={(e) => {
                // En cas d'erreur de chargement, on affiche l'icône par défaut
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (parent) {
                  parent.innerHTML = '<i class="fas fa-user-circle text-6xl text-gray-400" aria-hidden="true"></i>';
                }
              }}
            />
          ) : (
            <i className="fas fa-user-circle text-6xl text-gray-400" aria-hidden="true"></i>
          )}
        </div>
        <label
          htmlFor="photo-upload"
          className={`cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
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

      {/* Informations personnelles (lecture seule) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Informations personnelles">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-user mr-1" aria-hidden="true"></i> Nom complet
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
            {user.nom} {user.prenom}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-envelope mr-1" aria-hidden="true"></i> Email
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-briefcase mr-1" aria-hidden="true"></i> Fonction
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.fonction}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-church mr-1" aria-hidden="true"></i> Église
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.eglise || 'Non renseigné'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-map-marker-alt mr-1" aria-hidden="true"></i> District
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.district || 'Non renseigné'}</div>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-globe mr-1" aria-hidden="true"></i> Fédération
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.federation || 'Non renseigné'}</div>
        </div>
      </section>

      {/* Modification adresse et contact */}
      <section className="mt-6 border-t pt-4" aria-label="Modifier les coordonnées">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          <i className="fas fa-address-card mr-2" aria-hidden="true"></i>
          Coordonnées
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="adresse-input" className="block text-sm font-medium text-gray-700 mb-1">
              <i className="fas fa-home mr-1" aria-hidden="true"></i> Adresse
            </label>
            <input
              id="adresse-input"
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Entrez votre adresse"
              aria-describedby="contact-message"
            />
          </div>
          <div>
            <label htmlFor="contact-input" className="block text-sm font-medium text-gray-700 mb-1">
              <i className="fas fa-phone mr-1" aria-hidden="true"></i> Contact (téléphone)
            </label>
            <input
              id="contact-input"
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              placeholder="Entrez votre numéro de téléphone"
              aria-describedby="contact-message"
            />
          </div>
          <button
            onClick={handleSaveContact}
            disabled={isSavingContact || !hasContactChanged}
            className={`w-full py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
              isSavingContact || !hasContactChanged
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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

      {/* Changement de mot de passe (caché pour Admin) */}
      {!isAdmin && (
        <section className="mt-6 border-t pt-4" aria-label="Changer le mot de passe">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            <i className="fas fa-key mr-2" aria-hidden="true"></i>
            Changer le mot de passe
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe (min 4 caractères)
              </label>
              <input
                id="new-password"
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
                minLength="4"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={isChangingPassword}
              className={`w-full py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
                isChangingPassword
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
    </div>
  );
}