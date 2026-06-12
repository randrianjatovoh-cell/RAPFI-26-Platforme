// src/components/UserManagement.js
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function generateRandomPassword() {
  return Math.random().toString(36).slice(-8);
}

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', eglise: '', district: '', federation: '',
    fonction: '', motDePasse: '', adresse: '', contact: ''
  });
  const [message, setMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('users');
  const [logs, setLogs] = useState([]);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [visitsPerUser, setVisitsPerUser] = useState({});

  const federationsList = [
    'Fédération Madagascar Centre', 'Fédération Madagascar Nord', 'Fédération Madagascar Nord-Ouest',
    'Fédération Madagascar Est', 'Fédération Madagascar Sud-Est', 'Fédération Madagascar Sud-Ouest'
  ];

  useEffect(() => {
    loadUsers();
    loadFrequentation();
  }, []);

  async function loadUsers() {
    const all = await api.getAllUsers();
    setUsers(all);
  }

  async function loadFrequentation() {
    const allLogs = await api.getUserLogs();
    setLogs(allLogs);
    const unique = await api.getUniqueVisitorsCount();
    setUniqueVisitors(unique.count);
    const visits = await api.getVisitsPerUser();
    const visitsMap = {};
    visits.forEach(v => {
      visitsMap[`${v.user_id}_${v.userName}`] = v.count;
    });
    setVisitsPerUser(visitsMap);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      nom: '', prenom: '', email: '', eglise: '', district: '', federation: '',
      fonction: '', motDePasse: '', adresse: '', contact: ''
    });
  }

  async function handleSave() {
    if (!formData.nom || !formData.email || !formData.fonction || !formData.federation) {
      setMessage('Veuillez remplir nom, email, fonction et fédération');
      return;
    }
    let newPassword = formData.motDePasse;
    if (!editingId && !newPassword) {
      newPassword = generateRandomPassword();
      formData.motDePasse = newPassword;
    }
    if (editingId) {
      const existing = users.find(u => u.id === editingId);
      const updated = { ...existing, ...formData };
      await api.updateUser(editingId, updated);
      setMessage(`Utilisateur modifié. ${newPassword ? `Nouveau mot de passe: ${newPassword}` : ''}`);
    } else {
      const newUser = { ...formData, motDePasse: newPassword };
      await api.register(newUser);
      setMessage(`Utilisateur ajouté. Mot de passe: ${newPassword}`);
    }
    resetForm();
    await loadUsers();
    setTimeout(() => setMessage(''), 5000);
  }

  async function handleDelete(id) {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete.fonction === 'Admin') {
      setMessage("Impossible de supprimer le compte administrateur principal.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (window.confirm('Supprimer cet utilisateur ?')) {
      await api.deleteUser(id);
      await loadUsers();
    }
  }

  async function handleResetPassword(user) {
    const newPass = generateRandomPassword();
    await api.updateUserPassword(user.id, newPass);
    setMessage(`Nouveau mot de passe pour ${user.nom}: ${newPass}`);
    await loadUsers();
    setTimeout(() => setMessage(''), 5000);
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setFormData({ ...user, motDePasse: '' });
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestion des utilisateurs</h2>
      <div className="flex gap-2 mb-4 border-b pb-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-1 rounded ${activeSubTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Utilisateurs
        </button>
        <button
          onClick={() => setActiveSubTab('frequentation')}
          className={`px-4 py-1 rounded ${activeSubTab === 'frequentation' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Fréquentation
        </button>
      </div>

      {message && <div className="bg-green-100 p-2 mb-4 rounded">{message}</div>}

      {activeSubTab === 'users' && (
        <>
          <div className="mb-6 border p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">{editingId ? 'Modifier' : 'Ajouter'} un utilisateur</h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} className="border p-1" />
              <input type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="border p-1" />
              <select value={formData.federation} onChange={e => setFormData({ ...formData, federation: e.target.value })} className="border p-1">
                <option value="">Fédération *</option>
                {federationsList.map(f => <option key={f}>{f}</option>)}
              </select>
              <input type="text" placeholder="District" value={formData.district} onChange={e => setFormData({ ...formData, district: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Église" value={formData.eglise} onChange={e => setFormData({ ...formData, eglise: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Adresse" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Contact (téléphone)" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} className="border p-1" />
              <select value={formData.fonction} onChange={e => setFormData({ ...formData, fonction: e.target.value })} className="border p-1">
                <option value="">Fonction *</option>
                <option value="Ancien">Ancien</option>
                <option value="Trésorier">Trésorier</option>
                <option value="Pasteur">Pasteur</option>
                <option value="Vérificateur">Vérificateur</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-1 rounded">
                {editingId ? 'Mettre à jour' : 'Ajouter'}
              </button>
              <button onClick={resetForm} className="bg-gray-400 text-white px-4 py-1 rounded">
                Annuler
              </button>
            </div>
          </div>

          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-1">Nom</th>
                <th className="border p-1">Email</th>
                <th className="border p-1">Fonction</th>
                <th className="border p-1">Mot de passe</th>
                <th className="border p-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isAdmin = u.fonction === 'Admin';
                return (
                  <tr key={u.id}>
                    <td className="border p-1">{u.nom} {u.prenom}</td>
                    <td className="border p-1">{u.email}</td>
                    <td className="border p-1">{u.fonction}</td>
                    <td className="border p-1 font-mono text-sm">{u.motDePasse}</td>
                    <td className="border p-1">
                      <button onClick={() => handleEdit(u)} className="text-blue-600 mr-2">Modifier</button>
                      <button onClick={() => handleResetPassword(u)} className="text-green-600 mr-2">Reset MDP</button>
                      {!isAdmin && <button onClick={() => handleDelete(u.id)} className="text-red-600">Supprimer</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {activeSubTab === 'frequentation' && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded shadow">
              <div className="text-sm text-blue-800">Visiteurs uniques</div>
              <div className="text-3xl font-bold">{uniqueVisitors}</div>
            </div>
            <div className="bg-green-100 p-4 rounded shadow">
              <div className="text-sm text-green-800">Connexions totales</div>
              <div className="text-3xl font-bold">{logs.length}</div>
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">Détail des connexions</h3>
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr>
                  <th className="border p-1">Utilisateur</th>
                  <th className="border p-1">Fonction</th>
                  <th className="border p-1">Date et heure</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td className="border p-1">{log.userName}</td>
                    <td className="border p-1">{log.userFonction}</td>
                    <td className="border p-1">{new Date(log.date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2">Visites par utilisateur</h3>
            <ul className="list-disc pl-5">
              {Object.entries(visitsPerUser).map(([key, count]) => (
                <li key={key}>{key.split('_')[1]} : {count} connexion(s)</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}