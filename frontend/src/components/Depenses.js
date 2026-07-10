// frontend/src/components/Depenses.js
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, nombreEnLettresCapitalized, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

const MAX_AMOUNT = 1_000_000_000;

function isValidDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function formatMontant(value) {
  if (value === undefined || value === null || value === 0) return '';
  const num = Number(value);
  if (isNaN(num) || num === 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

const sampanaOptions = [
  "ASAFI", "Diakona", "Fahasalamana", "Fampielezam-boky", "Fanabeazana",
  "Fiduciare", "Fifandraisana", "FIPIA", "FIPIKRI", "Loholona",
  "Miandraikitra ny Asa soratry Ellen G. White", "MIFEM", "MIHOM", "MINENF",
  "Mpitam-bola", "Mpitantsoratra", "MOZIKA", "PARL", "Sekoly Sabata", "Tanora Adventiste (JA)"
];

const SABATA_OPTIONS = [
  { value: 1, label: 'Sabata 1' },
  { value: 2, label: 'Sabata 2' },
  { value: 3, label: 'Sabata 3' },
  { value: 4, label: 'Sabata 4' },
  { value: 5, label: 'Sabata 5' }
];

export default function Depenses({ currentMonth, refreshAll, user: propUser, selectedEglise, readOnly = false }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [expenses, setExpenses] = useState([]);
  const [volaSisaTeoAloha, setVolaSisaTeoAloha] = useState(0);
  const [volaSisaTeoAlohaDisplay, setVolaSisaTeoAlohaDisplay] = useState('0');
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [volaNihiditra, setVolaNihiditra] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isSavingSisa, setIsSavingSisa] = useState(false);
  const [sisaInputValue, setSisaInputValue] = useState('0');
  
  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isPasteur = user?.fonction === 'Pasteur';
  const isAncienOrTresorier = user?.fonction === 'Ancien' || user?.fonction === 'Trésorier';
  
  let effectiveEglise = selectedEglise || user?.eglise || '';
  let effectiveDistrict = user?.district || '';
  let effectiveFederation = user?.federation || '';
  
  if (isAdmin && selectedEglise) {
    effectiveEglise = selectedEglise;
    effectiveDistrict = '';
    effectiveFederation = '';
  }
  
  const eglise = effectiveEglise;
  const district = effectiveDistrict;
  const federation = effectiveFederation;

  const idCounter = useRef(0);

  const [newExpense, setNewExpense] = useState({
    date: "", vote: "", comDate: "", reason: "", sampana: "", 
    voaray: 0, amount: 0, mpiandraikitra: "", sonia: "",
    sabata: 1
  });

  useEffect(() => {
    if (currentMonth && eglise) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentMonth, eglise]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      let expensesList;
      if (isAdmin) {
        expensesList = await api.getDepenses(currentMonth, effectiveFederation, effectiveDistrict, effectiveEglise);
      } else if (isVerificateur) {
        expensesList = await api.getDepenses(currentMonth, effectiveFederation);
      } else if (isPasteur) {
        expensesList = await api.getDepenses(currentMonth, null, effectiveDistrict);
      } else {
        expensesList = await api.getDepenses(currentMonth, null, null, effectiveEglise);
      }
      
      const formatted = expensesList.map(exp => ({
        ...exp,
        date: isValidDateStr(exp.date) ? exp.date : "",
        comDate: isValidDateStr(exp.comDate) ? exp.comDate : "",
        sabata: exp.sabata || 1
      }));
      
      if (formatted.length > 0) {
        const maxId = Math.max(...formatted.map(e => e.id || 0));
        idCounter.current = maxId + 1;
      } else {
        idCounter.current = 1;
      }
      
      setExpenses(formatted);
      const total = formatted.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      setTotalExpenses(total);

      let glData;
      if (isAdmin) {
        glData = await api.getGL(currentMonth, effectiveFederation, effectiveDistrict, effectiveEglise);
      } else if (isVerificateur) {
        glData = await api.getGL(currentMonth, effectiveFederation);
      } else if (isPasteur) {
        glData = await api.getGL(currentMonth, null, effectiveDistrict);
      } else {
        glData = await api.getGL(currentMonth, null, null, effectiveEglise);
      }
      
      let totalB = 0;
      if (glData) {
        for (let s = 1; s <= 5; s++) {
          const entries = glData[s] || [];
          for (const entry of entries) {
            totalB += (entry.b9 || 0) + (entry.b10 || 0);
          }
        }
      }
      setVolaNihiditra(totalB);

      // 🔥 Récupérer volaSisaTeoAloha depuis la nouvelle table via l'API
      try {
        const val = await api.getVolaSisa(currentMonth, eglise);
        setVolaSisaTeoAloha(val);
        const displayVal = formatMontant(val) || '0';
        setVolaSisaTeoAlohaDisplay(displayVal);
        setSisaInputValue(displayVal);
        console.log(`✅ volaSisaTeoAloha récupéré: ${val} pour ${currentMonth} - ${eglise}`);
      } catch (err) {
        console.warn('⚠️ Erreur récupération volaSisaTeoAloha:', err);
        // Fallback: essayer localStorage
        const saved = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val)) {
            setVolaSisaTeoAloha(val);
            const displayVal = formatMontant(val) || '0';
            setVolaSisaTeoAlohaDisplay(displayVal);
            setSisaInputValue(displayVal);
            // Migrer vers le backend
            try {
              await api.setVolaSisa(currentMonth, eglise, val);
              localStorage.removeItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
              console.log('✅ Migration volaSisaTeoAloha vers backend réussie');
            } catch (err2) {
              console.warn('⚠️ Migration échouée:', err2);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement dépenses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function notifyExpensesUpdated() {
    window.dispatchEvent(new Event('expenses-updated'));
  }

  function validateAmount(value, fieldName = 'Montant') {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      alert(`${fieldName} doit être un nombre positif.`);
      return false;
    }
    if (num > MAX_AMOUNT) {
      alert(`${fieldName} ne peut pas dépasser ${MAX_AMOUNT.toLocaleString()} Ar.`);
      return false;
    }
    return true;
  }

  async function handleAdd() {
    if (readOnly) return;
    if (!currentMonth) { alert("Sélectionnez un mois."); return; }
    if (!eglise) { alert("Aucune église sélectionnée."); return; }

    const amountVal = parseFloat(newExpense.amount);
    const voarayVal = parseFloat(newExpense.voaray) || 0;

    if (!validateAmount(amountVal, 'Montant de la dépense')) return;
    if (!validateAmount(voarayVal, 'Montant reçu (voaray)')) return;

    const newId = idCounter.current++;
    const expense = {
      id: newId,
      monthId: currentMonth,
      eglise: eglise,
      date: newExpense.date || "",
      vote: newExpense.vote || "",
      comDate: newExpense.comDate || "",
      reason: newExpense.reason || "",
      sampana: newExpense.sampana || "",
      voaray: voarayVal,
      amount: amountVal,
      ambiny: voarayVal - amountVal,
      mpiandraikitra: newExpense.mpiandraikitra || "",
      sonia: newExpense.sonia || "",
      sabata: parseInt(newExpense.sabata) || 1
    };

    setIsAdding(true);
    try {
      let currentList;
      if (isAdmin) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation, effectiveDistrict, effectiveEglise);
      } else if (isVerificateur) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation);
      } else if (isPasteur) {
        currentList = await api.getDepenses(currentMonth, null, effectiveDistrict);
      } else {
        currentList = await api.getDepenses(currentMonth, null, null, effectiveEglise);
      }
      
      const updatedList = [...currentList, expense];
      
      await api.saveDepenses({
        month: currentMonth,
        data: updatedList,
        eglise: effectiveEglise,
        district: effectiveDistrict,
        federation: effectiveFederation
      });

      setNewExpense({
        date: "", vote: "", comDate: "", reason: "", sampana: "", 
        voaray: 0, amount: 0, mpiandraikitra: "", sonia: "",
        sabata: 1
      });

      await loadData();
      if (refreshAll) refreshAll();
      notifyExpensesUpdated();
    } catch (err) {
      console.error('❌ Erreur ajout dépense:', err);
      alert(`Erreur lors de l'ajout : ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  }

  function handleEdit(id) {
    if (readOnly) return;
    setEditingId(id);
    setOpenMenuId(null);
  }

  function handleCancelEdit() {
    setEditingId(null);
    loadData();
  }

  async function handleSaveEdit(id) {
    if (readOnly) return;
    const expense = expenses.find(e => e.id === id);
    if (!expense) return;

    if (!validateAmount(expense.amount, 'Montant de la dépense')) return;
    if (!validateAmount(expense.voaray, 'Montant reçu (voaray)')) return;

    try {
      let currentList;
      if (isAdmin) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation, effectiveDistrict, effectiveEglise);
      } else if (isVerificateur) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation);
      } else if (isPasteur) {
        currentList = await api.getDepenses(currentMonth, null, effectiveDistrict);
      } else {
        currentList = await api.getDepenses(currentMonth, null, null, effectiveEglise);
      }
      
      const updatedList = currentList.map(e => e.id === id ? { ...expense } : e);
      
      await api.saveDepenses({
        month: currentMonth,
        data: updatedList,
        eglise: effectiveEglise,
        district: effectiveDistrict,
        federation: effectiveFederation
      });
      
      setEditingId(null);
      await loadData();
      if (refreshAll) refreshAll();
      notifyExpensesUpdated();
    } catch (err) {
      console.error('❌ Erreur sauvegarde modification:', err);
      alert(`Erreur : ${err.message}`);
    }
  }

  function handleFieldChange(id, field, value) {
    if (readOnly) return;
    if ((field === 'amount' || field === 'voaray') && value !== '') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > MAX_AMOUNT) {
        alert(`Le ${field === 'amount' ? 'montant' : 'voaray'} ne peut pas dépasser ${MAX_AMOUNT.toLocaleString()} Ar.`);
        return;
      }
    }

    setExpenses(prev => prev.map(exp => {
      if (exp.id === id) {
        let updated = { ...exp, [field]: value };
        if (field === 'amount' || field === 'voaray') {
          const voaray = field === 'voaray' ? parseFloat(value) || 0 : exp.voaray || 0;
          const amount = field === 'amount' ? parseFloat(value) || 0 : exp.amount || 0;
          updated.ambiny = voaray - amount;
        }
        return updated;
      }
      return exp;
    }));
  }

  async function handleDelete(id) {
    if (readOnly) return;
    if (!window.confirm("Supprimer cette dépense ?")) return;
    try {
      let currentList;
      if (isAdmin) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation, effectiveDistrict, effectiveEglise);
      } else if (isVerificateur) {
        currentList = await api.getDepenses(currentMonth, effectiveFederation);
      } else if (isPasteur) {
        currentList = await api.getDepenses(currentMonth, null, effectiveDistrict);
      } else {
        currentList = await api.getDepenses(currentMonth, null, null, effectiveEglise);
      }
      
      const updatedList = currentList.filter(e => e.id !== id);
      
      await api.saveDepenses({
        month: currentMonth,
        data: updatedList,
        eglise: effectiveEglise,
        district: effectiveDistrict,
        federation: effectiveFederation
      });
      
      await loadData();
      if (refreshAll) refreshAll();
      notifyExpensesUpdated();
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert(`Erreur : ${err.message}`);
    }
  }

  function toggleMenu(id) {
    if (readOnly) return;
    setOpenMenuId(openMenuId === id ? null : id);
  }

  // 🔥 SAUVEGARDE SUR onBlur avec la nouvelle API
  const handleSisaInputChange = (e) => {
    if (readOnly) return;
    const raw = e.target.value;
    setSisaInputValue(raw);
    
    const numeric = raw.replace(/\s/g, '');
    const num = parseFloat(numeric);
    if (!isNaN(num) && num >= 0) {
      setVolaSisaTeoAlohaDisplay(formatMontant(num) || '0');
    }
  };

  const handleSisaBlur = async () => {
    if (readOnly) return;
    if (isSavingSisa) return;
    
    const numeric = sisaInputValue.replace(/\s/g, '');
    const num = parseFloat(numeric);
    
    let finalValue = 0;
    if (!isNaN(num) && num >= 0) {
      finalValue = num;
    }
    
    setVolaSisaTeoAloha(finalValue);
    setVolaSisaTeoAlohaDisplay(formatMontant(finalValue) || '0');
    
    setIsSavingSisa(true);
    try {
      // 🔥 Utiliser la nouvelle API pour sauvegarder dans la table séparée
      await api.setVolaSisa(currentMonth, eglise, finalValue);
      localStorage.removeItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
      console.log(`✅ volaSisaTeoAloha sauvegardé: ${finalValue} pour ${currentMonth} - ${eglise}`);
      
      // 🔥 Dispatcher les événements pour mettre à jour tous les composants
      window.dispatchEvent(new Event('sisa-updated'));
      window.dispatchEvent(new Event('data-updated'));
      notifyExpensesUpdated();
      
      const input = document.querySelector('.sisa-input');
      if (input) {
        input.style.borderColor = 'green';
        setTimeout(() => {
          input.style.borderColor = '';
        }, 1500);
      }
    } catch (err) {
      console.error('❌ Erreur sauvegarde volaSisaTeoAloha:', err);
      alert(`Erreur lors de la sauvegarde : ${err.message}`);
      // Recharger la valeur depuis le backend
      try {
        const val = await api.getVolaSisa(currentMonth, eglise);
        setVolaSisaTeoAloha(val);
        setVolaSisaTeoAlohaDisplay(formatMontant(val) || '0');
        setSisaInputValue(formatMontant(val) || '0');
      } catch (err2) {
        console.warn('⚠️ Erreur rechargement:', err2);
      }
    } finally {
      setIsSavingSisa(false);
    }
  };

  const handleSisaKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher les dépenses.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement des dépenses...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur : {error}</div>;

  const volaSisa = volaNihiditra - totalExpenses + volaSisaTeoAloha;
  const displayEglise = capitalizeFirstLetter(eglise);
  const displayDistrict = capitalizeFirstLetter(district);
  const displayFederation = (federation || '').toUpperCase();
  const mois = formatMonthYear(currentMonth).split(' ')[0];
  const annee = currentMonth ? currentMonth.split('-')[0] : '';

  const MontantDisplay = ({ value }) => {
    const formatted = formatMontant(value);
    return <span className="montant-cell">{formatted} Ar</span>;
  };

  return (
    <div className="depenses-container">
      <style>{`
        .depenses-container .table-wrapper { overflow-x: auto; }
        .depenses-container table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: auto; }
        .depenses-container table th, .depenses-container table td { padding: 6px 10px; vertical-align: middle; border: 1px solid #000; white-space: nowrap; text-align: center; }
        .depenses-container table thead th { background-color: #f3f4f6; font-weight: 600; }
        .col-daty-komity { width: 8% !important; min-width: 70px !important; }
        .col-antony { width: 22% !important; min-width: 150px !important; }
        td.col-voaray, td.col-fandaniana, td.col-ambiny { text-align: right !important; white-space: nowrap; }
        .depenses-container input, .depenses-container select { border: 1px solid #ccc; border-radius: 4px; padding: 2px 4px; font-size: inherit; width: 100%; box-sizing: border-box; background: #fff; }
        .depenses-container input:disabled, .depenses-container select:disabled { background: transparent; border: none; color: #000; cursor: default; }
        .depenses-container input[type="number"] { text-align: right; }
        .depenses-container .action-cell { text-align: center; white-space: nowrap; }
        .depenses-container .action-cell .dropdown-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 2px 6px; }
        .depenses-container .action-cell .dropdown-menu { position: absolute; background: white; border: 1px solid #ccc; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10; min-width: 120px; padding: 4px 0; margin-top: 2px; }
        .depenses-container .action-cell .dropdown-menu button { display: block; width: 100%; text-align: left; padding: 6px 12px; border: none; background: none; cursor: pointer; font-size: 13px; }
        .depenses-container .action-cell .dropdown-menu button:hover { background-color: #f0f0f0; }
        .depenses-container .action-cell .edit-actions button { margin: 0 2px; padding: 2px 6px; border: none; background: transparent; cursor: pointer; font-size: 14px; }
        .depenses-container .action-cell .edit-actions button:hover { opacity: 0.7; }
        .signatures-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; padding-top: 8px; border-top: none; }
        .signature-block { font-size: 10px; text-align: center; }
        .total-text { margin-top: 6px; margin-bottom: 4px; text-align: right; font-size: 11px; }
        .tableau-recaps { margin-left: auto; width: auto; border: 1px solid #000; }
        .tableau-recaps td { padding: 2px 6px; border: 1px solid #000; }
        .tableau-recaps td:first-child { text-align: left !important; }
        .tableau-recaps td:last-child { text-align: right !important; }
        .tableau-recaps input { text-align: right; width: 120px; border: none; background: transparent; font-weight: inherit; }
        .montant-cell { display: inline; white-space: nowrap; }
        .separator-line { width: 1px; height: 50px; background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .sisa-input { transition: border-color 0.3s ease; }
        .sisa-input-saving { opacity: 0.7; }
        @media print {
          @page { size: A4 landscape; margin: 0.4cm 0.3cm; }
          body, .depenses-print { font-size: 8pt !important; }
          .no-print, .no-print-action { display: none !important; }
          table { page-break-inside: avoid; }
          th, td { padding: 2px 4px !important; }
          input, select { border: none !important; background: transparent !important; font-size: inherit !important; }
          .depenses-container table { table-layout: auto !important; width: 100% !important; }
          .signatures-grid { border-top: none !important; page-break-inside: avoid; }
          .total-text { font-size: 9pt; }
          .depenses-container .action-cell .dropdown-menu { display: none !important; }
          .depenses-container .table-wrapper { overflow-x: visible !important; }
          .sabata-col { display: none !important; }
          .sabata-col-header { display: none !important; }
        }
      `}</style>

      <div className="depenses-print">
        <div className="flex items-center justify-between mb-2" style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px' }}>
              <img src="/FINANCE.png" alt="Finance" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <div className="separator-line" />
            <div style={{ width: '50px', height: '50px' }}>
              <img src="/Noir.png" alt="Noir" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>
          <div className="text-center flex-1">
            {displayFederation && <div className="font-bold text-lg uppercase">{displayFederation}</div>}
            <div className="font-bold text-lg">TATITRY NY VOLA NIVOAKA</div>
            <div className="text-sm italic">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA" (Ohab. 28:20a)</div>
          </div>
          <div className="no-print">
            <button onClick={() => window.print()} className="bg-gray-600 text-white px-2 py-0.5 rounded text-sm">🖨️ Imprimer</button>
          </div>
        </div>

        <div className="flex flex-wrap justify-between items-start mt-1">
          <div className="text-left text-sm">
            <div><strong>DISTRIKA:</strong> {escapeHtml(displayDistrict)}</div>
            <div><strong>FIANGONANA:</strong> {escapeHtml(displayEglise)}</div>
            <div><strong>Volana:</strong> {mois}</div>
            <div><strong>Taona:</strong> {annee}</div>
          </div>
          <div className="text-right">
            <table className="tableau-recaps">
              <tbody>
                <tr>
                  <td className="font-semibold">Vola sisa teo aloha :</td>
                  <td className="text-right">
                    <input
                      type="text"
                      value={sisaInputValue}
                      onChange={handleSisaInputChange}
                      onBlur={handleSisaBlur}
                      onKeyDown={handleSisaKeyDown}
                      className={`sisa-input ${isSavingSisa ? 'sisa-input-saving' : ''}`}
                      style={{ textAlign: 'right', width: '120px' }}
                      placeholder="0"
                      disabled={readOnly || isSavingSisa}
                    />
                    {isSavingSisa && <span className="ml-1 text-xs text-blue-500 animate-pulse">⏳</span>}
                    Ar
                  </td>
                </tr>
                <tr><td className="font-semibold">Vola nihiditra :</td><td className="text-right"><MontantDisplay value={volaNihiditra} /></td></tr>
                <tr><td className="font-semibold">Totalin'ny fandaniana :</td><td className="text-right"><MontantDisplay value={totalExpenses} /></td></tr>
                <tr><td className="font-semibold">Vola sisa :</td><td className="text-right"><MontantDisplay value={volaSisa} /></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th rowSpan="2">N°</th>
                <th rowSpan="2">Daty</th>
                <th rowSpan="2" className="sabata-col-header">Sabata</th>
                <th colSpan="4">KOMITY</th>
                <th colSpan="3">Vola</th>
                <th colSpan="2">Mpiandraikitra &amp; sonia</th>
                <th rowSpan="2" className="action-cell no-print-action">Action</th>
              </tr>
              <tr>
                <th>Voty faha-</th>
                <th className="col-daty-komity">Daty komity</th>
                <th className="col-antony">Antony</th>
                <th>Sampana</th>
                <th className="col-voaray">Voaray</th>
                <th className="col-fandaniana">Fandaniana</th>
                <th className="col-ambiny">Ambiny</th>
                <th>Mpiandraikitra</th>
                <th>Sonia</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => {
                const ambinyCalculated = (Number(exp.voaray) || 0) - (Number(exp.amount) || 0);
                const isEditing = editingId === exp.id;
                return (
                  <tr key={exp.id}>
                    <td>{idx+1}</td>
                    <td>
                      {isEditing ? (
                        <input type="date" value={exp.date || ""} onChange={e => handleFieldChange(exp.id, "date", e.target.value)} style={{ width: '120px' }} disabled={readOnly} />
                      ) : (
                        <span>{formatDateShort(exp.date)}</span>
                      )}
                    </td>
                    <td className="sabata-col">
                      {isEditing ? (
                        <select value={exp.sabata || 1} onChange={e => handleFieldChange(exp.id, "sabata", parseInt(e.target.value))} disabled={readOnly} style={{ width: '80px' }}>
                          {SABATA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        <span>Sabata {exp.sabata || 1}</span>
                      )}
                    </td>
                    <td><input type="text" value={exp.vote || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "vote", e.target.value) : null} disabled={!isEditing || readOnly} /></td>
                    <td className="col-daty-komity"><input type="text" value={exp.comDate || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "comDate", e.target.value) : null} disabled={!isEditing || readOnly} style={{ textAlign: 'center' }} /></td>
                    <td className="col-antony"><input type="text" value={exp.reason || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "reason", e.target.value) : null} disabled={!isEditing || readOnly} /></td>
                    <td><select value={exp.sampana || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "sampana", e.target.value) : null} disabled={!isEditing || readOnly}><option value="">--</option>{sampanaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></td>
                    <td className="col-voaray">{isEditing ? <input type="number" value={exp.voaray || 0} onChange={e => handleFieldChange(exp.id, "voaray", e.target.value)} step="any" disabled={readOnly} /> : <MontantDisplay value={exp.voaray} />}</td>
                    <td className="col-fandaniana">{isEditing ? <input type="number" value={exp.amount || 0} onChange={e => handleFieldChange(exp.id, "amount", e.target.value)} step="any" disabled={readOnly} /> : <MontantDisplay value={exp.amount} />}</td>
                    <td className="col-ambiny"><MontantDisplay value={ambinyCalculated} /></td>
                    <td><input type="text" value={exp.mpiandraikitra || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "mpiandraikitra", e.target.value) : null} disabled={!isEditing || readOnly} placeholder="Nom" /></td>
                    <td><input type="text" value={exp.sonia || ""} onChange={e => isEditing ? handleFieldChange(exp.id, "sonia", e.target.value) : null} disabled={!isEditing || readOnly} /></td>
                    <td className="action-cell no-print-action">
                      {isEditing ? (
                        <div className="edit-actions">
                          <button onClick={() => handleSaveEdit(exp.id)} className="text-green-600" title="Sauvegarder" disabled={readOnly}><i className="fas fa-save"></i></button>
                          <button onClick={handleCancelEdit} className="text-gray-500" title="Annuler" disabled={readOnly}><i className="fas fa-times"></i></button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <button className="dropdown-btn" onClick={() => toggleMenu(exp.id)} title="Actions" disabled={readOnly}><i className="fas fa-ellipsis-v"></i></button>
                          {openMenuId === exp.id && !readOnly && (
                            <div className="dropdown-menu">
                              <button onClick={() => handleEdit(exp.id)}><i className="fas fa-edit"></i> Modifier</button>
                              <button onClick={() => handleDelete(exp.id)} className="text-red-600"><i className="fas fa-trash"></i> Supprimer</button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="8" className="text-right font-bold">Total des dépenses :</td>
                <td className="font-bold text-right"><MontantDisplay value={totalExpenses} /></td>
                <td></td><td></td><td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="total-text">
          <strong>Arrêté à la somme de Ariary:</strong> <i>{nombreEnLettresCapitalized(totalExpenses)} Ar.</i>
        </div>

        <div className="signatures-grid">
          <div className="signature-block">Mpitam-bola mpanampy:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Mpitam-bola:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Loholona:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Pasteur:<br/><br/>_______________<br/>(sonia)</div>
        </div>
      </div>

      {/* Formulaire d'ajout avec sélection Sabata */}
      <div className="mt-3 no-print grid grid-cols-1 md:grid-cols-10 gap-2 bg-gray-50 p-3 rounded-lg">
        <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="border p-1 rounded" disabled={readOnly} />
        <select value={newExpense.sabata} onChange={e => setNewExpense({ ...newExpense, sabata: parseInt(e.target.value) })} className="border p-1 rounded" disabled={readOnly}>
          {SABATA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <input type="text" value={newExpense.vote} onChange={e => setNewExpense({ ...newExpense, vote: e.target.value })} placeholder="Voty faha" className="border p-1 rounded" disabled={readOnly} />
        <input type="date" value={newExpense.comDate} onChange={e => setNewExpense({ ...newExpense, comDate: e.target.value })} className="border p-1 rounded" disabled={readOnly} />
        <input type="text" value={newExpense.reason} onChange={e => setNewExpense({ ...newExpense, reason: e.target.value })} placeholder="Antony" className="border p-1 rounded" disabled={readOnly} />
        <select value={newExpense.sampana} onChange={e => setNewExpense({ ...newExpense, sampana: e.target.value })} className="border p-1 rounded" disabled={readOnly}>
          <option value="">Sampana</option>
          {sampanaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <input type="number" value={newExpense.voaray} onChange={e => setNewExpense({ ...newExpense, voaray: e.target.value })} placeholder="Voaray (Ar)" className="border p-1 rounded text-right" disabled={readOnly} />
        <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Fandaniana (Ar)" className="border p-1 rounded text-right" disabled={readOnly} />
        <input type="text" value={newExpense.mpiandraikitra} onChange={e => setNewExpense({ ...newExpense, mpiandraikitra: e.target.value })} placeholder="Mpiandraikitra" className="border p-1 rounded" disabled={readOnly} />
        <button onClick={handleAdd} disabled={isAdding || readOnly} className={`bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition ${(isAdding || readOnly) ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {isAdding ? 'Ajout...' : <><i className="fas fa-plus"></i> Ajouter</>}
        </button>
      </div>
    </div>
  );
}