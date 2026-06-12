// src/components/StatistiquesConnexion.js
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function StatistiquesConnexion() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [visitsPerUser, setVisitsPerUser] = useState({});

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const all = await api.getUserLogs();
      setLogs(all);
      const unique = await api.getUniqueVisitorsCount();
      setUniqueVisitors(unique.count);
      const visits = await api.getVisitsPerUser();
      const visitsMap = {};
      visits.forEach(v => { visitsMap[`${v.user_id}_${v.userName}`] = v.count; });
      setVisitsPerUser(visitsMap);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filteredLogs = filter ? logs.filter(l => l.userName.toLowerCase().includes(filter.toLowerCase())) : logs;
  const stats = {
    total: logs.length,
    parUser: logs.reduce((acc, l) => { acc[l.userName] = (acc[l.userName] || 0) + 1; return acc; }, {}),
  };

  if (loading) return <div className="text-center p-4">Chargement des statistiques...</div>;

  return (
    <div><h2 className="text-2xl font-bold mb-4">Fréquentation de l'application</h2>
      <div className="mb-4 flex gap-2"><input type="text" placeholder="Filtrer par nom" value={filter} onChange={e=>setFilter(e.target.value)} className="border p-2 rounded w-64" /><button onClick={loadLogs} className="bg-gray-600 text-white px-3 py-1 rounded">Rafraîchir</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"><div className="bg-blue-100 p-4 rounded"><h3 className="font-bold">Nombre total de connexions</h3><p className="text-2xl">{logs.length}</p></div><div className="bg-green-100 p-4 rounded"><h3 className="font-bold">Utilisateurs distincts</h3><p className="text-2xl">{uniqueVisitors}</p></div></div>
      <div className="border p-2 mb-6"><h3 className="font-bold mb-2">Connexions par utilisateur</h3><table className="w-full text-sm"><tbody>{Object.entries(stats.parUser).map(([user, count])=><tr key={user}><td className="border p-1">{user}</td><td className="border p-1 text-right">{count}</td></tr>)}</tbody></table></div>
      <h3 className="text-xl font-semibold mb-2">Historique des connexions</h3>
      <div className="overflow-x-auto"><table className="w-full border"><thead className="bg-gray-100"><tr><th className="border p-1">Date et heure</th><th className="border p-1">Utilisateur</th><th className="border p-1">Fonction</th></tr></thead><tbody>{filteredLogs.map(log=><tr key={log.id}><td className="border p-1">{new Date(log.date).toLocaleString()}</td><td className="border p-1">{log.userName}</td><td className="border p-1">{log.userFonction}</td></tr>)}</tbody></table></div>
    </div>
  );
}