// src/components/Formulaire.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

export default function Formulaire({
  user: propUser, // pour compatibilité si on passe user en prop
  currentMonth,
  setCurrentMonth,
  months,
  setMonths,
  refreshAll,
  onDataSaved,
  selectedSabbath,
  onSabbathChange,
  selectedEglise,
  onEgliseChange,
  readOnly = false
}) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;

  const [churchConfig, setChurchConfig] = useState({ district: "ANTSAHATANTERAKA", church: "", code: "" });
  const [sabbathIndex, setSabbathIndex] = useState(selectedSabbath || '');
  const [sabbathDate, setSabbathDate] = useState("");
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
  const [loading, setLoading] = useState(true);
  const [eglises, setEglises] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');

  const isPasteur = user?.fonction === 'Pasteur';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isAdmin = user?.fonction === 'Admin';
  const isTresorier = user?.fonction === 'Trésorier';
  const isAncien = user?.fonction === 'Ancien';
  const canAddMonth = (isAdmin || isPasteur || isTresorier || isAncien) && !readOnly;
  const hasFixedChurch = !isPasteur && !isVerificateur;

  useEffect(() => {
    api.getChurchConfig().then(config => setChurchConfig(config || { district: "ANTSAHATANTERAKA", church: "", code: "" }));
  }, []);

  useEffect(() => {
    if (isVerificateur && user?.federation) loadDistrictsByFederation();
  }, [isVerificateur, user]);

  async function loadDistrictsByFederation() {
    const allUsers = await api.getAllUsers();
    const districtsList = [...new Set(allUsers.filter(u => u.federation === user.federation && u.district).map(u => u.district))];
    setDistricts(districtsList);
    if (districtsList.length > 0 && !selectedDistrict) setSelectedDistrict(districtsList[0]);
  }

  useEffect(() => {
    if (isVerificateur && selectedDistrict) loadEglisesByDistrict(selectedDistrict);
    else if (isPasteur && user?.district && !readOnly) loadEglisesByDistrict(user.district);
  }, [isVerificateur, isPasteur, selectedDistrict, user, readOnly]);

  useEffect(() => {
    if (hasFixedChurch && user?.eglise && !selectedEglise) onEgliseChange(user.eglise);
  }, [hasFixedChurch, user, selectedEglise, onEgliseChange]);

  async function loadEglisesByDistrict(district) {
    const allUsers = await api.getAllUsers();
    const eglisesList = [...new Set(allUsers.filter(u => u.district === district && u.eglise).map(u => u.eglise))];
    setEglises(eglisesList);
    if (eglisesList.length > 0 && (!selectedEglise || !eglisesList.includes(selectedEglise))) onEgliseChange(eglisesList[0]);
  }

  useEffect(() => {
    if (onSabbathChange && sabbathIndex) onSabbathChange(parseInt(sabbathIndex));
    else if (onSabbathChange && !sabbathIndex) onSabbathChange(null);
  }, [sabbathIndex, onSabbathChange]);

  useEffect(() => {
    async function loadMonths() {
      const mois = await api.getMonths();
      if (setMonths) setMonths(mois);
      if (mois.length > 0 && !currentMonth && setCurrentMonth) setCurrentMonth(mois[0].id);
    }
    loadMonths();
  }, []);

  const refreshMonths = async () => {
    const mois = await api.getMonths();
    if (setMonths) setMonths(mois);
  };

  useEffect(() => {
    if (currentMonth && selectedEglise && sabbathIndex) {
      loadEntries();
      loadSabbathDate();
    } else {
      setEntries([]);
      setTotals({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
      setLoading(false);
    }
  }, [currentMonth, sabbathIndex, selectedEglise]);

  async function loadSabbathDate() {
    try {
      const report = await api.getMonthlyReport(currentMonth, selectedEglise);
      if (report && report.sabbathDates && report.sabbathDates[parseInt(sabbathIndex)-1]) setSabbathDate(report.sabbathDates[parseInt(sabbathIndex)-1]);
      else setSabbathDate("");
    } catch (err) { console.error(err); }
  }

  async function loadEntries() {
    setLoading(true);
    try {
      const glData = await api.getGL(currentMonth);
      const sabbathNum = parseInt(sabbathIndex);
      const data = glData && glData[sabbathNum] ? glData[sabbathNum] : [];
      if (data.length === 0) setEntries([createEmptyEntry()]);
      else setEntries(data);
      computeTotals(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function createEmptyEntry() {
    return {
      id: Date.now() + Math.random() * 10000,
      memberName: "",
      rosia: "",
      f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0,
      b9: 0, b10: 0
    };
  }

  function addRow() {
    if (readOnly) return;
    setEntries(prev => [...prev, createEmptyEntry()]);
  }

  function removeRow(id) {
    if (readOnly) return;
    const newEntries = entries.filter(e => e.id !== id);
    setEntries(newEntries);
    computeTotals(newEntries);
  }

  function updateEntry(id, field, value) {
    if (readOnly) return;
    const newEntries = entries.map(e => e.id === id ? { ...e, [field]: value } : e);
    setEntries(newEntries);
    computeTotals(newEntries);
  }

  function computeTotals(entriesList) {
    const newTotals = { f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 };
    for (let e of entriesList) {
      newTotals.f1 += e.f1 || 0; newTotals.f2 += e.f2 || 0; newTotals.f3 += e.f3 || 0;
      newTotals.f4 += e.f4 || 0; newTotals.f5 += e.f5 || 0; newTotals.f6 += e.f6 || 0;
      newTotals.f7 += e.f7 || 0; newTotals.f8 += e.f8 || 0;
      newTotals.b9 += e.b9 || 0; newTotals.b10 += e.b10 || 0;
    }
    setTotals(newTotals);
  }

  async function handleSave() {
    if (readOnly) return alert("Mode consultation, pas de modification.");
    if (!currentMonth) return alert("Sélectionnez un mois.");
    if (!sabbathIndex) return alert("Sélectionnez un Sabata.");
    if (!sabbathDate) return alert("Renseignez la date du Sabata.");
    if (!selectedEglise) return alert("Sélectionnez une église.");
    if (entries.length === 0) return alert("Aucune ligne à sauvegarder.");

    try {
      await api.saveChurchConfig(churchConfig);
      let glData = await api.getGL(currentMonth) || {};
      glData[sabbathIndex] = entries.map(e => ({
        ...e,
        monthId: currentMonth,
        sabbathIndex: parseInt(sabbathIndex),
        eglise: selectedEglise
      }));
      await api.saveGL(currentMonth, glData);
      await api.updateSabbathDate(currentMonth, selectedEglise, parseInt(sabbathIndex), sabbathDate);
      alert(`Sabata ${sabbathIndex} sauvegardé pour ${selectedEglise}!`);
      if (refreshAll) await refreshAll();
      if (onDataSaved) onDataSaved();
    } catch (err) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    }
  }

  const goToPreviousMonth = () => {
    if (!months || months.length === 0) return;
    const idx = months.findIndex(m => m.id === currentMonth);
    if (idx > 0) setCurrentMonth(months[idx-1].id);
  };
  const goToNextMonth = () => {
    if (!months || months.length === 0) return;
    const idx = months.findIndex(m => m.id === currentMonth);
    if (idx < months.length-1) setCurrentMonth(months[idx+1].id);
  };
  const handleMonthChange = (e) => setCurrentMonth(e.target.value);

  const addNewMonth = async () => {
    if (!canAddMonth) return alert("Non autorisé.");
    const newMonthId = prompt("Nouveau mois (AAAA-MM) :");
    if (!newMonthId || !/^\d{4}-\d{2}$/.test(newMonthId)) return alert("Format invalide.");
    try {
      await api.addMonth(newMonthId);
      await refreshMonths();
      setCurrentMonth(newMonthId);
      alert(`Mois ${newMonthId} ajouté.`);
    } catch (err) {
      if (err.message.includes('exists')) alert("Ce mois existe déjà.");
      else alert(`Erreur : ${err.message}`);
    }
  };

  const totalAGeneral = totals.f1+totals.f2+totals.f3+totals.f4+totals.f5+totals.f6+totals.f7+totals.f8;
  const totalBGeneral = totals.b9+totals.b10;

  if (loading) return <div className="text-center p-4">Chargement du formulaire...</div>;

  const displayDistrict = capitalizeFirstLetter(user?.district || churchConfig.district || "ANTSAHATANTERAKA");

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg no-print">
        <div className="flex flex-col">
          <div><strong>Fédération :</strong> {user?.federation || 'Non renseignée'}</div>
          <div className="mt-1"><strong>District :</strong> 
            {isVerificateur ? (
              <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="ml-2 border rounded px-2 py-1" disabled={readOnly}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : ` ${displayDistrict}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Mois :</label>
          <select value={currentMonth || ''} onChange={handleMonthChange} className="border rounded px-2 py-1 bg-white" disabled={readOnly}>
            {months && months.map(m => <option key={m.id} value={m.id}>{formatMonthYear(m.id)}</option>)}
          </select>
          <button onClick={goToPreviousMonth} className="bg-gray-500 text-white px-2 py-1 rounded text-sm" disabled={readOnly}>◀</button>
          <button onClick={goToNextMonth} className="bg-gray-500 text-white px-2 py-1 rounded text-sm" disabled={readOnly}>▶</button>
          {canAddMonth && (
            <button onClick={addNewMonth} className="bg-green-600 text-white px-3 py-1 rounded text-sm">+ Ajouter mois</button>
          )}
        </div>
        <div className="text-center">
          <label className="block text-sm font-medium">Code :</label>
          <input type="text" value={churchConfig.code || ''} onChange={e => setChurchConfig({...churchConfig, code: e.target.value})} className="border rounded px-2 py-1 w-32 text-center" placeholder="Code" disabled={readOnly} />
        </div>
        <div className="text-right">
          <div><strong>Eglise :</strong></div>
          {hasFixedChurch ? (
            <div className="border rounded px-2 py-1 bg-gray-100 min-w-[150px] text-center">
              {selectedEglise || user?.eglise || "Non définie"}
            </div>
          ) : (
            <select value={selectedEglise || ''} onChange={e => onEgliseChange(e.target.value)} className="border rounded px-2 py-1 bg-white" disabled={readOnly}>
              {eglises.map(eg => <option key={eg} value={eg}>{eg}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 no-print">
        <div className="flex gap-2">
          <select
            value={sabbathIndex}
            onChange={e => setSabbathIndex(e.target.value)}
            className="border rounded-lg p-2 bg-gray-50"
            disabled={readOnly}
          >
            <option value="">-- Sélectionner un Sabata --</option>
            <option value="1">Sabata Faha-1</option>
            <option value="2">Sabata Faha-2</option>
            <option value="3">Sabata Faha-3</option>
            <option value="4">Sabata Faha-4</option>
            <option value="5">Sabata Faha-5</option>
          </select>
        </div>
        <div className="text-xs text-gray-500">Sabata (daty) : <input type="date" value={sabbathDate} onChange={e => setSabbathDate(e.target.value)} className="border rounded px-2 py-1" disabled={readOnly} /></div>
      </div>

      {!sabbathIndex && (
        <div className="bg-yellow-100 p-3 rounded mb-3 text-center">
          Veuillez sélectionner un Sabata pour commencer.
        </div>
      )}

      {sabbathIndex && (
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] text-sm border-collapse border border-black">
            <thead className="bg-gray-100">
              <tr className="text-center">
                <th rowSpan="2" className="bg-gray-200 border p-1">N°</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Anarana na SABATA</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Rosia n°</th>
                <th colSpan="8" className="bg-blue-100 border p-1">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th>
                <th colSpan="2" className="bg-green-100 border p-1">MIJANONA HO AN'NY FIANGONANA (B)</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Tontalin'ny A</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Tontalin'ny B</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Action</th>
              </tr>
              <tr className="text-xs">
                <th className="bg-blue-50 border p-1">(1) Ampahafolony</th>
                <th className="bg-blue-50 border p-1">(2) Sekoly Sabata faha-13</th>
                <th className="bg-blue-50 border p-1">(3) Fanambinana</th>
                <th className="bg-blue-50 border p-1">(4) Tsingerin-taona</th>
                <th className="bg-blue-50 border p-1">(5) Fanompoam-pivavahana 50%</th>
                <th className="bg-blue-50 border p-1">(6) Federasiona</th>
                <th className="bg-blue-50 border p-1">(7) Maneran-tany</th>
                <th className="bg-blue-50 border p-1">(8) Manokana</th>
                <th className="bg-green-50 border p-1">(9) Fiangonana</th>
                <th className="bg-green-50 border p-1">(10) Manokana</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const sumA = entry.f1+entry.f2+entry.f3+entry.f4+entry.f5+entry.f6+entry.f7+entry.f8;
                const sumB = entry.b9+entry.b10;
                return (
                  <tr key={entry.id}>
                    <td className="border p-1 text-center">{idx+1}</td>
                    <td className="border p-1"><input type="text" value={entry.memberName || ''} onChange={e => updateEntry(entry.id, 'memberName', e.target.value)} className="w-32 border px-1" placeholder="Anarana" disabled={readOnly} /></td>
                    <td className="border p-1"><input type="text" value={entry.rosia || ''} onChange={e => updateEntry(entry.id, 'rosia', e.target.value)} className="w-24 border px-1" placeholder="Rosia n°" disabled={readOnly} /></td>
                    {['f1','f2','f3','f4','f5','f6','f7','f8'].map(f => (
                      <td key={f} className="border p-1 bg-blue-50"><input type="number" value={entry[f] || 0} onChange={e => updateEntry(entry.id, f, parseFloat(e.target.value)||0)} className="w-24 border text-right px-1" step="any" disabled={readOnly} /></td>
                    ))}
                    <td className="border p-1 bg-green-50"><input type="number" value={entry.b9 || 0} onChange={e => updateEntry(entry.id, 'b9', parseFloat(e.target.value)||0)} className="w-24 border text-right" step="any" disabled={readOnly} /></td>
                    <td className="border p-1 bg-green-50"><input type="number" value={entry.b10 || 0} onChange={e => updateEntry(entry.id, 'b10', parseFloat(e.target.value)||0)} className="w-24 border text-right" step="any" disabled={readOnly} /></td>
                    <td className="border p-1 text-right bg-blue-100">{sumA}</td>
                    <td className="border p-1 text-right bg-green-100">{sumB}</td>
                    <td className="border p-1 text-center"><button onClick={() => removeRow(entry.id)} className="text-red-500" disabled={readOnly}><i className="fas fa-trash"></i></button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td colSpan="3" className="border text-right">TOTAL</td>
                <td className="border text-right">{totals.f1}</td>
                <td className="border text-right">{totals.f2}</td>
                <td className="border text-right">{totals.f3}</td>
                <td className="border text-right">{totals.f4}</td>
                <td className="border text-right">{totals.f5}</td>
                <td className="border text-right">{totals.f6}</td>
                <td className="border text-right">{totals.f7}</td>
                <td className="border text-right">{totals.f8}</td>
                <td className="border text-right">{totals.b9}</td>
                <td className="border text-right">{totals.b10}</td>
                <td className="border text-right bg-blue-200">{totalAGeneral}</td>
                <td className="border text-right bg-green-200">{totalBGeneral}</td>
                <td className="border"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex justify-between mt-4 no-print">
        <button onClick={addRow} className="bg-emerald-600 text-white px-4 py-2 rounded-lg" disabled={readOnly}><i className="fas fa-plus-circle"></i> Ajouter ligne</button>
        <button onClick={handleSave} className="bg-indigo-700 text-white px-6 py-2 rounded-lg" disabled={readOnly}><i className="fas fa-save"></i> Sauvegarder ce Sabata</button>
      </div>
      <div className="mt-4 p-2 bg-blue-50 rounded text-sm no-print">
        Les données sauvegardées mettent à jour automatiquement le Grand Livre, les rapports et le carnet de dîme.
      </div>
    </div>
  );
}