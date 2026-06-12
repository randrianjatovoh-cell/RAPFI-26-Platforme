// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, escapeHtml, capitalizeFirstLetter, formatNumber } from '../services/helpers';

export default function Dashboard({ pasteurMode, mode }) {
  const { user } = useUser();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFederation, setSelectedFederation] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedEglise, setSelectedEglise] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [availableEglises, setAvailableEglises] = useState([]);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const federationsList = ['FMC', 'FMN', 'FMNO', 'FME', 'FMSE', 'FMSO'];

  useEffect(() => {
    if (user && (user.fonction === 'Trésorier' || user.fonction === 'Ancien')) loadOwnData();
    else if (user && user.fonction === 'Pasteur' && pasteurMode === 'ajout') loadOwnData();
    else if (user && (user.fonction === 'Pasteur' && pasteurMode === 'voir') || user.fonction === 'Vérificateur') setLoading(false);
  }, [user, pasteurMode]);

  async function loadOwnData() {
    setLoading(true);
    try {
      let reportsList = [];
      if (user.fonction === 'Pasteur' && pasteurMode === 'ajout') {
        reportsList = await api.getAllMonthlyReportsByDistrict(user.district);
      } else {
        reportsList = await api.getAllMonthlyReportsForEglise(user.eglise);
      }
      setReports(reportsList.sort((a,b) => a.monthId.localeCompare(b.monthId)));
      const allStats = await api.getMembersStats();
      setStats(allStats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (user && (user.fonction === 'Vérificateur' || (user.fonction === 'Pasteur' && pasteurMode === 'voir'))) {
      setSelectedFederation(user.federation || federationsList[0]);
    }
  }, [user]);

  useEffect(() => {
    if (selectedFederation) {
      api.getAllUsers().then(allUsers => {
        const districts = [...new Set(allUsers.filter(u => u.federation === selectedFederation && u.district).map(u => u.district))];
        setAvailableDistricts(districts);
        setSelectedDistrict('');
        setAvailableEglises([]);
        setSelectedEglise('');
        setViewData(null);
      });
    }
  }, [selectedFederation]);

  useEffect(() => {
    if (selectedDistrict) {
      api.getAllUsers().then(allUsers => {
        const eglises = [...new Set(allUsers.filter(u => u.district === selectedDistrict && u.eglise).map(u => u.eglise))];
        setAvailableEglises(eglises);
        setSelectedEglise('');
        setViewData(null);
      });
    }
  }, [selectedDistrict]);

  useEffect(() => {
    if (selectedEglise) loadViewData();
  }, [selectedEglise]);

  async function loadViewData() {
    setViewLoading(true);
    try {
      const reportsList = await api.getAllMonthlyReportsForEglise(selectedEglise);
      setViewData(reportsList.sort((a,b) => a.monthId.localeCompare(b.monthId)));
    } catch (err) { console.error(err); }
    finally { setViewLoading(false); }
  }

  const totalA = reports.reduce((s, r) => s + (r.totalA || 0), 0);
  const totalB = reports.reduce((s, r) => s + (r.totalB || 0), 0);
  const totalExpenses = reports.reduce((s, r) => s + (r.totalExpenses || 0), 0);
  const balanceChurch = reports.reduce((s, r) => s + (r.balanceChurch || 0), 0);

  if (loading) return <div className="text-center p-4">Chargement du tableau de bord...</div>;

  if ((user.fonction === 'Trésorier' || user.fonction === 'Ancien') || (user.fonction === 'Pasteur' && pasteurMode === 'ajout')) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Tableau de bord - {user.fonction === 'Pasteur' ? `District: ${user.district}` : `Église: ${escapeHtml(user.eglise)}`}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded shadow"><div className="text-sm">Total A (Fédération)</div><div className="text-2xl font-bold">{totalA.toLocaleString()} Ar</div></div>
          <div className="bg-green-100 p-4 rounded shadow"><div className="text-sm">Total B (Église)</div><div className="text-2xl font-bold">{totalB.toLocaleString()} Ar</div></div>
          <div className="bg-red-100 p-4 rounded shadow"><div className="text-sm">Total Dépenses</div><div className="text-2xl font-bold">{totalExpenses.toLocaleString()} Ar</div></div>
          <div className="bg-purple-100 p-4 rounded shadow"><div className="text-sm">Solde Église</div><div className="text-2xl font-bold">{balanceChurch.toLocaleString()} Ar</div></div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Rapports mensuels</h3>
        <div className="overflow-x-auto"><table className="w-full border"><thead><tr><th className="border p-1">Mois</th><th className="border p-1">Total A</th><th className="border p-1">Total B</th><th className="border p-1">Dépenses</th><th className="border p-1">Solde</th></tr></thead><tbody>{reports.map(r => <tr key={r.monthId}><td className="border p-1">{formatMonthYear(r.monthId)}</td><td className="border p-1 text-right">{formatNumber(r.totalA)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalB)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalExpenses)} Ar</td><td className="border p-1 text-right">{formatNumber(r.balanceChurch)} Ar</td></tr>)}</tbody></table></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{user.fonction === 'Vérificateur' ? 'Consultation - Fédération' : 'Consultation - District'}</h2>
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium">Fédération</label><select value={selectedFederation} onChange={e => setSelectedFederation(e.target.value)} className="border w-full p-2" disabled={user.fonction === 'Vérificateur'}>{federationsList.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
          <div><label className="block text-sm font-medium">District</label><select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="border w-full p-2"><option value="">-- Sélectionner un district --</option>{availableDistricts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
          <div><label className="block text-sm font-medium">Église</label><select value={selectedEglise} onChange={e => setSelectedEglise(e.target.value)} className="border w-full p-2"><option value="">-- Sélectionner une église --</option>{availableEglises.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
        </div>
      </div>
      {viewLoading && <div className="text-center p-4">Chargement des données...</div>}
      {viewData && viewData.length > 0 && (
        <div><h3 className="text-xl font-semibold mb-2">Rapports mensuels - {escapeHtml(selectedEglise)}</h3><div className="overflow-x-auto"><table className="w-full border"><thead><tr><th className="border p-1">Mois</th><th className="border p-1">Total A</th><th className="border p-1">Total B</th><th className="border p-1">Dépenses</th><th className="border p-1">Solde</th></tr></thead><tbody>{viewData.map(r => <tr key={r.monthId}><td className="border p-1">{formatMonthYear(r.monthId)}</td><td className="border p-1 text-right">{formatNumber(r.totalA)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalB)} Ar</td><td className="border p-1 text-right">{formatNumber(r.totalExpenses)} Ar</td><td className="border p-1 text-right">{formatNumber(r.balanceChurch)} Ar</td></tr>)}</tbody></table></div><div className="mt-4 no-print"><button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded"><i className="fas fa-print"></i> Imprimer</button></div></div>
      )}
      {viewData && viewData.length === 0 && selectedEglise && <div className="text-center p-4">Aucun rapport pour cette église.</div>}
    </div>
  );
}