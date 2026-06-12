// src/components/RecapFederation.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber } from '../services/helpers';

export default function RecapFederation({ user: propUser, readOnly = false }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState({});
  const [groupBy, setGroupBy] = useState('eglise');
  const [selectedFederation, setSelectedFederation] = useState(user?.federation || '');
  const federationsList = ['FMC', 'FMN', 'FMNO', 'FME', 'FMSE', 'FMSO'];

  useEffect(() => {
    if (user) {
      if (user.fonction === 'Vérificateur' && user.federation) setSelectedFederation(user.federation);
      else if (user.fonction === 'Admin') setSelectedFederation(federationsList[0]);
      else if (user.fonction === 'Pasteur' && user.district) setSelectedFederation(user.federation || '');
    }
  }, [user]);

  useEffect(() => {
    if (selectedFederation) loadFederationReports();
  }, [selectedFederation, selectedYear, selectedMonth, groupBy]);

  async function loadFederationReports() {
    if (!selectedFederation) return;
    setLoading(true);
    try {
      const allReports = await api.getFederationReports(selectedFederation, selectedYear.toString(), selectedMonth);
      if (groupBy === 'eglise') {
        const grouped = {};
        allReports.forEach(r => { if (!grouped[r.eglise]) grouped[r.eglise] = []; grouped[r.eglise].push(r); });
        setReports(grouped);
      } else {
        const allUsers = await api.getAllUsers();
        const churchToDistrict = {};
        allUsers.forEach(u => { if (u.eglise) churchToDistrict[u.eglise] = u.district; });
        const grouped = {};
        allReports.forEach(r => { const district = churchToDistrict[r.eglise] || 'District inconnu'; if (!grouped[district]) grouped[district] = []; grouped[district].push(r); });
        setReports(grouped);
      }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const years = [2023,2024,2025,2026,2027];
  const months = [{value:'',label:'Toute l\'année'},{value:'01',label:'Janvier'},{value:'02',label:'Février'},{value:'03',label:'Mars'},{value:'04',label:'Avril'},{value:'05',label:'Mai'},{value:'06',label:'Juin'},{value:'07',label:'Juillet'},{value:'08',label:'Août'},{value:'09',label:'Septembre'},{value:'10',label:'Octobre'},{value:'11',label:'Novembre'},{value:'12',label:'Décembre'}];
  const computeTotals = (reportsList) => reportsList.reduce((acc,r)=>({ totalA: acc.totalA+(r.totalA||0), totalB: acc.totalB+(r.totalB||0), totalExpenses: acc.totalExpenses+(r.totalExpenses||0), balance: acc.balance+(r.balanceChurch||0) }), { totalA:0, totalB:0, totalExpenses:0, balance:0 });

  if (loading) return <div className="text-center p-4">Chargement des données fédérales...</div>;

  return (
    <div><h2 className="text-2xl font-bold mb-4">Récapitulatif Fédération - {selectedFederation}</h2>
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded">
        {user?.fonction === 'Admin' && <div><label className="block text-sm font-medium">Fédération</label><select value={selectedFederation} onChange={e=>setSelectedFederation(e.target.value)} className="border p-2 rounded" disabled={readOnly}>{federationsList.map(f=><option key={f} value={f}>{f}</option>)}</select></div>}
        <div><label className="block text-sm font-medium">Année</label><select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))} className="border p-2 rounded" disabled={readOnly}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
        <div><label className="block text-sm font-medium">Mois</label><select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="border p-2 rounded" disabled={readOnly}>{months.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        <div><label className="block text-sm font-medium">Grouper par</label><select value={groupBy} onChange={e=>setGroupBy(e.target.value)} className="border p-2 rounded" disabled={readOnly}><option value="eglise">Église</option><option value="district">District</option></select></div>
      </div>
      {Object.keys(reports).length===0 && <div className="text-center p-4">Aucune donnée pour cette sélection.</div>}
      {Object.entries(reports).map(([key, reportsList])=> { const totals = computeTotals(reportsList); return (
        <div key={key} className="mb-8 border rounded p-3"><h3 className="text-xl font-semibold mb-2 bg-gray-100 p-2">{groupBy==='eglise' ? `Église : ${key}` : `District : ${key}`}</h3>
          <div className="grid grid-cols-4 gap-2 text-sm mb-3"><div className="bg-blue-50 p-1">Total A: {formatNumber(totals.totalA)} Ar</div><div className="bg-green-50 p-1">Total B: {formatNumber(totals.totalB)} Ar</div><div className="bg-red-50 p-1">Dépenses: {formatNumber(totals.totalExpenses)} Ar</div><div className="bg-purple-50 p-1">Solde: {formatNumber(totals.balance)} Ar</div></div>
          <div className="overflow-x-auto"><table className="w-full text-sm border"><thead><tr><th className="border p-1">Mois</th><th className="border p-1">Total A</th><th className="border p-1">Total B</th><th className="border p-1">Dépenses</th><th className="border p-1">Solde</th></tr></thead><tbody>{reportsList.map(r=><tr key={r.monthId}><td className="border p-1">{formatMonthYear(r.monthId)}</td><td className="border p-1 text-right">{formatNumber(r.totalA)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalB)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalExpenses)} Ar</td><td className="border p-1 text-right">{formatNumber(r.balanceChurch)} Ar</td></tr>)}</tbody></table></div></div>);
      })}
    </div>
  );
}