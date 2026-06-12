// src/components/Profile.js
import React, { useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export default function Profile({ onUserUpdate, onClose }) {
  const { user, logout } = useUser();
  const [photo, setPhoto] = useState(user?.photo || '');
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adresse, setAdresse] = useState(user?.adresse || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataURL = reader.result;
        setPhoto(dataURL);
        try {
          await api.updateUserPhoto(user.id, dataURL);
          setMessage('Photo mise à jour !');
          if (onUserUpdate) onUserUpdate({ ...user, photo: dataURL });
          setTimeout(() => setMessage(''), 3000);
        } catch (err) { setMessage('Erreur lors de la mise à jour de la photo'); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMessage('Les nouveaux mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 4) { setMessage('Le mot de passe doit comporter au moins 4 caractères'); return; }
    try {
      await api.updateUserPassword(user.id, newPassword);
      setMessage('Mot de passe modifié avec succès !');
      setNewPassword(''); setConfirmPassword('');
      const updatedUser = { ...user, motDePasse: newPassword };
      if (onUserUpdate) onUserUpdate(updatedUser);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('Erreur lors du changement de mot de passe'); }
  };

  const handleSaveAdresseContact = async () => {
    setIsSaving(true);
    try {
      const updatedUser = { ...user, adresse, contact };
      await api.updateUser(user.id, { adresse, contact });
      setMessage('Adresse et contact mis à jour !');
      if (onUserUpdate) onUserUpdate(updatedUser);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) { setMessage('Erreur lors de la mise à jour'); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Mon profil</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times text-xl"></i></button>
      </div>
      <div className="flex flex-col items-center mb-6">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mb-2">
          {photo ? <img src={photo} alt="Photo de profil" className="w-full h-full object-cover" /> : <i className="fas fa-user-circle text-6xl text-gray-400"></i>}
        </div>
        <button onClick={()=>fileInputRef.current.click()} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm"><i className="fas fa-camera mr-1"></i> Changer la photo</button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoChange} className="hidden" />
      </div>
      <div className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700">Nom complet</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.nom} {user.prenom}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Email</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.email}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Fonction</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.fonction}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Niveau</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.niveau === 1 ? 'Admin' : user.niveau === 2 ? 'Ancien/Trésorier/Vérificateur' : 'Pasteur'}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Église</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.eglise || 'Non renseigné'}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">District</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.district || 'Non renseigné'}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Fédération</label><div className="mt-1 p-2 bg-gray-100 rounded">{user.federation || 'Non renseigné'}</div></div>
        <div><label className="block text-sm font-medium text-gray-700">Adresse</label><input type="text" value={adresse} onChange={e=>setAdresse(e.target.value)} className="mt-1 w-full border rounded p-2" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Contact (téléphone)</label><input type="text" value={contact} onChange={e=>setContact(e.target.value)} className="mt-1 w-full border rounded p-2" /></div>
        <button onClick={handleSaveAdresseContact} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{isSaving ? 'Enregistrement...' : 'Enregistrer adresse et contact'}</button>
        <div className="border-t pt-4 mt-4"><h3 className="text-lg font-semibold mb-3">Changer le mot de passe</h3><form onSubmit={handlePasswordChange} className="space-y-3"><input type="password" placeholder="Nouveau mot de passe (min 4 caractères)" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="w-full border rounded p-2" required /><input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full border rounded p-2" required /><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">Modifier le mot de passe</button></form></div>
      </div>
      {message && <div className="mt-4 p-2 bg-green-100 text-green-700 rounded">{message}</div>}
    </div>
  );
}