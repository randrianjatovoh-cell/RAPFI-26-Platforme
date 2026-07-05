// src/components/StatistiquesConnexion.js
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function StatistiquesConnexion() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [uniqueVisitors, setUniqueVisitors] = useState(0);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const all = await api.getUserLogs();
      setLogs(all);

      const unique = await api.getUniqueVisitorsCount();
      setUniqueVisitors(unique.count || 0);
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
      setError(err.message || 'Impossible de charger les statistiques.');
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = filter
    ? logs.filter(l => l.userName?.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  const statsParUser = logs.reduce((acc, l) => {
    const name = l.userName || 'Inconnu';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <div className="text-center p-4">Chargement des statistiques...</div>;

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 rounded">
        <h3 className="text-red-700 font-bold">⚠️ Erreur</h3>
        <p className="text-red-600">{error}</p>
        <button onClick={loadLogs} className="mt-2 bg-red-600 text-white px-4 py-1 rounded">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📊 Fréquentation de l'application</h2>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Filtrer par nom"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border p-2 rounded w-64"
        />
        <button onClick={loadLogs} className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700">
          <i className="fas fa-sync-alt mr-1"></i> Rafraîchir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded shadow">
          <h3 className="font-bold text-blue-800">🔹 Nombre total de connexions</h3>
          <p className="text-3xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-green-100 p-4 rounded shadow">
          <h3 className="font-bold text-green-800">👤 Utilisateurs distincts</h3>
          <p className="text-3xl font-bold">{uniqueVisitors}</p>
        </div>
      </div>

      <div className="border p-3 rounded mb-6 bg-white shadow">
        <h3 className="font-bold text-lg mb-2">👥 Connexions par utilisateur</h3>
        {Object.keys(statsParUser).length === 0 ? (
          <p className="text-gray-500">Aucune connexion enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Utilisateur</th>
                <th className="border p-2 text-right">Nombre de connexions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statsParUser)
                .sort((a, b) => b[1] - a[1])
                .map(([user, count]) => (
                  <tr key={user}>
                    <td className="border p-2">{user}</td>
                    <td className="border p-2 text-right font-semibold">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 className="text-xl font-semibold mb-2">📋 Historique des connexions</h3>
      <div className="overflow-x-auto border rounded shadow bg-white">
        {filteredLogs.length === 0 ? (
          <p className="p-4 text-gray-500">Aucun historique correspondant.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Date et heure</th>
                <th className="border p-2 text-left">Utilisateur</th>
                <th className="border p-2 text-left">Fonction</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border p-2">{new Date(log.date).toLocaleString('fr-FR')}</td>
                  <td className="border p-2">{log.userName || 'Inconnu'}</td>
                  <td className="border p-2">{log.userFonction || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}