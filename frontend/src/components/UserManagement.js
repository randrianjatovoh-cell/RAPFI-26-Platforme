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
    nom: '', prenom: '', email: '', fonction: '', eglise: '', district: '', federation: '',
    motDePasse: '', adresse: '', contact: ''
  });
  const [message, setMessage] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('users');

  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [visitsPerUser, setVisitsPerUser] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  const [districtsList, setDistrictsList] = useState([]);
  const [eglisesList, setEglisesList] = useState([]);

  const federationsList = [
    'Fédération Madagascar Centre', 'Fédération Madagascar Nord', 'Fédération Madagascar Nord-Ouest',
    'Fédération Madagascar Est', 'Fédération Madagascar Sud-Est', 'Fédération Madagascar Sud-Ouest'
  ];

  useEffect(() => {
    async function fetchLists() {
      try {
        const allUsers = await api.getAllUsers();
        const districts = [...new Set(allUsers.map(u => u.district).filter(d => d))];
        const eglises = [...new Set(allUsers.map(u => u.eglise).filter(e => e))];
        setDistrictsList(districts);
        setEglisesList(eglises);
      } catch (err) {
        console.error('Erreur chargement listes :', err);
      }
    }
    fetchLists();
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'frequentation') {
      loadFrequentation();
    }
  }, [page]);

  async function loadUsers() {
    try {
      const all = await api.getAllUsers();
      setUsers(all);
      setMessage('');
    } catch (err) {
      console.error('Erreur chargement users', err);
      setMessage('Erreur de chargement des utilisateurs : ' + err.message);
    }
  }

  async function loadFrequentation() {
    setLoading(true);
    try {
      const logsData = await api.getUserLogs(limit, page * limit);
      setLogs(logsData.logs || []);
      setTotalLogs(logsData.total || 0);
      setTotalPages(Math.ceil((logsData.total || 0) / limit));
      
      const unique = await api.getUniqueVisitorsCount();
      setUniqueVisitors(unique.count);
      
      const visits = await api.getVisitsPerUser();
      setVisitsPerUser(visits);
    } catch (err) {
      console.error('Erreur chargement fréquentation', err);
      setMessage('Erreur de chargement des statistiques : ' + err.message);
    }
    setLoading(false);
  }

  const handleTabChange = (tab) => {
    setActiveSubTab(tab);
    if (tab === 'frequentation') {
      setPage(0);
      loadFrequentation();
    }
  };

  function resetForm() {
    setEditingId(null);
    setFormData({
      nom: '', prenom: '', email: '', fonction: '', eglise: '', district: '', federation: '',
      motDePasse: '', adresse: '', contact: ''
    });
  }

  const handleFonctionChange = (e) => {
    const selected = e.target.value;
    setFormData({
      ...formData,
      fonction: selected,
      eglise: (selected === 'Pasteur' || selected === 'Vérificateur') ? '' : formData.eglise,
      district: selected === 'Vérificateur' ? '' : formData.district,
    });
  };

  const isEgliseDisabled = () => {
    const f = formData.fonction;
    return f === 'Pasteur' || f === 'Vérificateur';
  };

  const isDistrictDisabled = () => {
    return formData.fonction === 'Vérificateur';
  };

  async function handleSave() {
    if (!formData.nom || !formData.email || !formData.fonction || !formData.federation) {
      setMessage('Veuillez remplir nom, email, fonction et fédération');
      return;
    }
    let newPassword = formData.motDePasse;
    if (!editingId && !newPassword) {
      newPassword = generateRandomPassword();
    }

    const cleanUser = {
      nom: formData.nom,
      prenom: formData.prenom || "",
      email: formData.email,
      eglise: formData.eglise || "",
      district: formData.district || "",
      federation: formData.federation,
      responsable: "",
      fonction: formData.fonction,
      niveau: 3,
      photo: "",
      adresse: formData.adresse || "",
      contact: formData.contact || "",
      password: newPassword,
      plain_password: newPassword
    };

    try {
      if (editingId) {
        const editingUser = users.find(u => u.id === editingId);
        // Interdire la modification du mot de passe pour l'admin
        if (editingUser?.fonction === 'Admin' && formData.motDePasse) {
          setMessage('Le mot de passe de l\'administrateur ne peut pas être modifié.');
          setTimeout(() => setMessage(''), 5000);
          return;
        }
        const updateData = { ...cleanUser };
        if (!formData.motDePasse || editingUser?.fonction === 'Admin') {
          delete updateData.password;
          delete updateData.plain_password;
        }
        await api.updateUser(editingId, updateData);
        setMessage(`Utilisateur modifié. ${formData.motDePasse && editingUser?.fonction !== 'Admin' ? `Nouveau mot de passe: ${formData.motDePasse}` : ''}`);
      } else {
        await api.register(cleanUser);
        setMessage(`Utilisateur ajouté. Mot de passe: ${newPassword}`);
      }
      resetForm();
      await loadUsers();
      const allUsers = await api.getAllUsers();
      const districts = [...new Set(allUsers.map(u => u.district).filter(d => d))];
      const eglises = [...new Set(allUsers.map(u => u.eglise).filter(e => e))];
      setDistrictsList(districts);
      setEglisesList(eglises);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde :', err);
      setMessage(`Erreur : ${err.message}`);
    }
    setTimeout(() => setMessage(''), 5000);
  }

  async function handleDelete(id) {
    const userToDelete = users.find(u => u.id === id);
    if (userToDelete?.email === 'plateformerapfi@gmail.com') {
      setMessage("Impossible de supprimer le compte administrateur principal.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (window.confirm('Supprimer cet utilisateur ?')) {
      try {
        await api.deleteUser(id);
        await loadUsers();
        setMessage('Utilisateur supprimé.');
      } catch (err) {
        setMessage(`Erreur : ${err.message}`);
      }
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function handleResetPassword(user) {
    if (user.fonction === 'Admin') {
      setMessage('Le mot de passe de l\'administrateur ne peut pas être réinitialisé.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const newPass = generateRandomPassword();
    try {
      await api.updateUserPassword(user.id, newPass);
      setMessage(`Nouveau mot de passe pour ${user.nom}: ${newPass}`);
      await loadUsers();
    } catch (err) {
      setMessage(`Erreur : ${err.message}`);
    }
    setTimeout(() => setMessage(''), 5000);
  }

  function handleEdit(user) {
    setEditingId(user.id);
    setFormData({
      ...user,
      motDePasse: ''
    });
  }

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'En cours';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} min ${secs} s`;
    return `${secs} s`;
  };

  const exportCSV = () => {
    if (logs.length === 0) {
      setMessage('Aucune donnée à exporter');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    const headers = ['Date', 'Utilisateur', 'Fonction', 'IP', 'Durée (sec)'];
    const rows = logs.map(log => [
      new Date(log.date).toLocaleString(),
      log.userName,
      log.userFonction,
      log.ip || '',
      log.session_duration_seconds || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Gestion des utilisateurs</h2>
      <div className="flex gap-2 mb-4 border-b pb-2">
        <button
          onClick={() => handleTabChange('users')}
          className={`px-4 py-1 rounded ${activeSubTab === 'users' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Utilisateurs
        </button>
        <button
          onClick={() => handleTabChange('frequentation')}
          className={`px-4 py-1 rounded ${activeSubTab === 'frequentation' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
        >
          Fréquentation
        </button>
      </div>

      {message && <div className={`p-2 mb-4 rounded ${message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}

      {activeSubTab === 'users' && (
        <>
          <div className="mb-6 border p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">{editingId ? 'Modifier' : 'Ajouter'} un utilisateur</h3>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nom *" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Prénom" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} className="border p-1" />
              <input type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="border p-1" />
              <select value={formData.fonction} onChange={handleFonctionChange} className="border p-1">
                <option value="">Fonction *</option>
                <option value="Ancien">Ancien</option>
                <option value="Trésorier">Trésorier</option>
                <option value="Pasteur">Pasteur</option>
                <option value="Vérificateur">Vérificateur</option>
                <option value="Admin">Admin</option>
              </select>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Église"
                  list="eglises-list"
                  value={formData.eglise}
                  onChange={e => setFormData({ ...formData, eglise: e.target.value })}
                  className="border p-1 w-full"
                  disabled={isEgliseDisabled()}
                />
                <datalist id="eglises-list">
                  {eglisesList.map(eg => <option key={eg} value={eg} />)}
                </datalist>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="District"
                  list="districts-list"
                  value={formData.district}
                  onChange={e => setFormData({ ...formData, district: e.target.value })}
                  className="border p-1 w-full"
                  disabled={isDistrictDisabled()}
                />
                <datalist id="districts-list">
                  {districtsList.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <select value={formData.federation} onChange={e => setFormData({ ...formData, federation: e.target.value })} className="border p-1">
                <option value="">Fédération *</option>
                {federationsList.map(f => <option key={f}>{f}</option>)}
              </select>
              <input type="text" placeholder="Adresse" value={formData.adresse} onChange={e => setFormData({ ...formData, adresse: e.target.value })} className="border p-1" />
              <input type="text" placeholder="Contact (téléphone)" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} className="border p-1" />
              {editingId && (
                <>
                  {(() => {
                    const editingUser = users.find(u => u.id === editingId);
                    const isEditingAdmin = editingUser?.fonction === 'Admin';
                    if (isEditingAdmin) {
                      return (
                        <div className="col-span-2 text-gray-500 italic">
                          Mot de passe non modifiable pour l'administrateur.
                        </div>
                      );
                    }
                    return (
                      <input
                        type="text"
                        placeholder="Nouveau mot de passe (laisser vide pour ne pas changer)"
                        value={formData.motDePasse}
                        onChange={e => setFormData({ ...formData, motDePasse: e.target.value })}
                        className="border p-1"
                      />
                    );
                  })()}
                </>
              )}
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
                    <td className="border p-1 font-mono text-sm">{u.plain_password || '—'}</td>
                    <td className="border p-1">
                      <button onClick={() => handleEdit(u)} className="text-blue-600 mr-2">Modifier</button>
                      {!isAdmin && (
                        <>
                          <button onClick={() => handleResetPassword(u)} className="text-yellow-600 mr-2">
                            <i className="fas fa-key"></i> Réinitialiser MDP
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="text-red-600">Supprimer</button>
                        </>
                      )}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded shadow">
              <div className="text-sm text-blue-800">Visiteurs uniques</div>
              <div className="text-3xl font-bold">{uniqueVisitors}</div>
            </div>
            <div className="bg-green-100 p-4 rounded shadow">
              <div className="text-sm text-green-800">Connexions totales</div>
              <div className="text-3xl font-bold">{totalLogs}</div>
            </div>
            <div className="bg-purple-100 p-4 rounded shadow">
              <div className="text-sm text-purple-800">Utilisateurs actifs</div>
              <div className="text-3xl font-bold">{visitsPerUser.length}</div>
            </div>
          </div>

          <div className="mb-6 bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-3">Visites par utilisateur</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1 text-left">Utilisateur</th>
                    <th className="border p-1 text-right">Connexions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitsPerUser.map((item) => (
                    <tr key={item.user_id}>
                      <td className="border p-1">{item.nom} {item.prenom}</td>
                      <td className="border p-1 text-right">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Historique des connexions</h3>
              <div className="flex gap-2">
                <button onClick={exportCSV} className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                  <i className="fas fa-file-csv mr-1"></i> Exporter CSV
                </button>
                <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
                  <i className="fas fa-print"></i> Imprimer
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-1">Date et heure</th>
                    <th className="border p-1">Utilisateur</th>
                    <th className="border p-1">Fonction</th>
                    <th className="border p-1">IP</th>
                    <th className="border p-1">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="text-center p-4">Chargement...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan="5" className="text-center p-4">Aucune connexion enregistrée</td></tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id}>
                        <td className="border p-1">{new Date(log.date).toLocaleString()}</td>
                        <td className="border p-1">{log.userName}</td>
                        <td className="border p-1">{log.userFonction}</td>
                        <td className="border p-1 font-mono text-xs">{log.ip || '—'}</td>
                        <td className="border p-1">{formatDuration(log.session_duration_seconds)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 0} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">
                  ◀
                </button>
                <span className="text-sm">Page {page + 1} / {totalPages}</span>
                <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">
                  ▶
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}