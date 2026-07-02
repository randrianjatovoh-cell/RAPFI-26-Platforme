import React, { useState, useRef, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export default function Profile({ onClose }) {
  const { user, updateUser } = useUser();
  const [photo, setPhoto] = useState(user?.photo || '');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adresse, setAdresse] = useState(user?.adresse || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [isSaving, setIsSaving] = useState(false);
  const [originalAdresse, setOriginalAdresse] = useState(user?.adresse || '');
  const [originalContact, setOriginalContact] = useState(user?.contact || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isAdmin = user?.fonction === 'Admin';

  useEffect(() => {
    setAdresse(user?.adresse || '');
    setContact(user?.contact || '');
    setOriginalAdresse(user?.adresse || '');
    setOriginalContact(user?.contact || '');
    setPhoto(user?.photo || '');
  }, [user]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Le fichier doit être une image');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('La photo ne doit pas dépasser 5 Mo');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      // ✅ Vérifier que user.id existe
      if (!user?.id) {
        setMessage('Erreur: utilisateur non identifié');
        setMessageType('error');
        setTimeout(() => setMessage(''), 5000);
        setUploading(false);
        return;
      }

      const result = await api.uploadUserPhoto(user.id, formData);
      
      setPhoto(result.photoUrl);
      updateUser({ photo: result.photoUrl });

      setMessage('Photo mise à jour avec succès !');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Erreur upload photo:', err);
      setMessage(`Erreur: ${err.message || 'Impossible de mettre à jour la photo'}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (isAdmin) {
      setMessage('Le mot de passe de l\'administrateur ne peut pas être modifié.');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    if (newPassword.length < 4) {
      setMessage('Le mot de passe doit contenir au moins 4 caractères');
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
      return;
    }
    try {
      await api.updateUserPassword(user.id, newPassword);
      setMessage('Mot de passe modifié avec succès !');
      setMessageType('success');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Erreur changement mot de passe:', err);
      setMessage(`Erreur: ${err.message || 'Impossible de changer le mot de passe'}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleSaveAdresseContact = async () => {
    if (adresse === originalAdresse && contact === originalContact) {
      setMessage('Aucune modification détectée');
      setMessageType('info');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setIsSaving(true);
    try {
      // ✅ Vérifier que user.id existe
      if (!user?.id) {
        setMessage('Erreur: utilisateur non identifié');
        setMessageType('error');
        setTimeout(() => setMessage(''), 5000);
        setIsSaving(false);
        return;
      }
      await api.updateUser(user.id, { adresse, contact });
      updateUser({ adresse, contact });
      setOriginalAdresse(adresse);
      setOriginalContact(contact);
      setMessage('Adresse et contact mis à jour !');
      setMessageType('success');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('❌ Erreur mise à jour adresse/contact:', err);
      setMessage(`Erreur: ${err.message || 'Impossible de mettre à jour'}`);
      setMessageType('error');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = adresse !== originalAdresse || contact !== originalContact;

  const renderMessage = () => {
    if (!message) return null;
    const bgColor = 
      messageType === 'success' ? 'bg-green-50 border-green-400 text-green-700' :
      messageType === 'error' ? 'bg-red-50 border-red-400 text-red-700' :
      'bg-blue-50 border-blue-400 text-blue-700';
    return (
      <div className={`mt-4 p-3 rounded border ${bgColor} flex items-center`}>
        <i className={`fas fa-${messageType === 'success' ? 'check-circle' : messageType === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2`}></i>
        {message}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center mb-6 relative border-b pb-4">
        <h2 className="text-2xl font-bold flex-1 text-center text-indigo-700">
          <i className="fas fa-user-circle mr-2"></i>Mon profil
        </h2>
        <button 
          onClick={onClose} 
          className="absolute right-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      {/* Photo de profil */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-3 border-4 border-indigo-100 shadow-md">
          {photo ? (
            <img 
              src={photo} 
              alt="Photo de profil" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<i class="fas fa-user-circle text-6xl text-gray-400"></i>';
              }}
            />
          ) : (
            <i className="fas fa-user-circle text-6xl text-gray-400"></i>
          )}
        </div>
        <label 
          htmlFor="photo-upload" 
          className={`cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <i className="fas fa-camera"></i> 
          {uploading ? 'Téléchargement...' : 'Changer la photo'}
        </label>
        <input 
          id="photo-upload"
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handlePhotoChange} 
          className="hidden" 
          disabled={uploading}
        />
      </div>

      {/* Grille d'informations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-user mr-1"></i> Nom complet
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.nom} {user.prenom}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-envelope mr-1"></i> Email
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-briefcase mr-1"></i> Fonction
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.fonction}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-church mr-1"></i> Église
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.eglise || 'Non renseigné'}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-map-marker-alt mr-1"></i> District
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.district || 'Non renseigné'}</div>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <i className="fas fa-globe mr-1"></i> Fédération
          </label>
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">{user.federation || 'Non renseigné'}</div>
        </div>
      </div>

      {/* Adresse et contact */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          <i className="fas fa-address-card mr-2"></i>Coordonnées
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <i className="fas fa-home mr-1"></i> Adresse
            </label>
            <input 
              type="text" 
              value={adresse} 
              onChange={e => setAdresse(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" 
              placeholder="Entrez votre adresse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <i className="fas fa-phone mr-1"></i> Contact (téléphone)
            </label>
            <input 
              type="tel" 
              value={contact} 
              onChange={e => setContact(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" 
              placeholder="Entrez votre numéro de téléphone"
            />
          </div>
          <button 
            onClick={handleSaveAdresseContact} 
            disabled={isSaving || !hasChanges} 
            className={`w-full py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
              isSaving || !hasChanges 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSaving ? (
              <><i className="fas fa-spinner fa-spin"></i> Enregistrement...</>
            ) : (
              <><i className="fas fa-save"></i> Enregistrer adresse et contact</>
            )}
          </button>
        </div>
      </div>

      {/* Changement de mot de passe - masqué pour Admin */}
      {!isAdmin && (
        <div className="mt-6 border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            <i className="fas fa-key mr-2"></i>Changer le mot de passe
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <input 
              type="password" 
              placeholder="Nouveau mot de passe (min 4 caractères)" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" 
              required 
            />
            <input 
              type="password" 
              placeholder="Confirmer le nouveau mot de passe" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" 
              required 
            />
            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <i className="fas fa-key"></i> Modifier le mot de passe
            </button>
          </form>
        </div>
      )}

      {renderMessage()}
    </div>
  );
}