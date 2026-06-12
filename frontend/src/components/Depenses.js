// src/components/Depenses.js
import React, { useState, useEffect } from 'react';
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

const sampanaOptions = [
  "ASAFI", "Diakona", "Fahasalamana", "Fampielezam-boky", "Fanabeazana",
  "Fiduciare", "Fifandraisana", "FIPIA", "FIPIKRI", "Loholona",
  "Miandraikitra ny Asa soratry Ellen G. White", "MIFEM", "MIHOM", "MINENF",
  "Mpitam-bola", "Mpitantsoratra", "MOZIKA", "PARL", "Sekoly Sabata", "Tanora Adventiste (JA)"
];

export default function Depenses({ currentMonth, refreshAll, user: propUser, selectedEglise }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [expenses, setExpenses] = useState([]);
  const [volaSisaTeoAloha, setVolaSisaTeoAloha] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [volaNihiditra, setVolaNihiditra] = useState(0);
  const eglise = selectedEglise || user?.eglise || '';
  const district = user?.district || '';
  const federation = user?.federation || '';

  const [newExpense, setNewExpense] = useState({
    date: "", vote: "", comDate: "", reason: "", sampana: "", voaray: 0, amount: 0, mpiandraikitra: "", sonia: ""
  });

  useEffect(() => {
    if (currentMonth && eglise) loadData();
  }, [currentMonth, eglise]);

  async function loadData() {
    let expensesList = await api.getDepenses(currentMonth);
    expensesList = expensesList.map(exp => ({
      ...exp,
      date: isValidDateStr(exp.date) ? exp.date : "",
      comDate: isValidDateStr(exp.comDate) ? exp.comDate : ""
    }));
    setExpenses(expensesList);
    const total = expensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    setTotalExpenses(total);
    const report = await api.getMonthlyReport(currentMonth, eglise);
    setVolaNihiditra(report ? (report.totalB || 0) : 0);
    const saved = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
    setVolaSisaTeoAloha(saved ? parseFloat(saved) : 0);
  }

  function notifyExpensesUpdated() {
    window.dispatchEvent(new Event('expenses-updated'));
  }

  async function handleAdd() {
    let amountVal = parseFloat(newExpense.amount);
    if (isNaN(amountVal) || amountVal <= 0) { alert("Montant invalide"); return; }
    if (amountVal > MAX_AMOUNT) { alert(`Montant trop élevé`); return; }
    const voarayVal = parseFloat(newExpense.voaray) || 0;
    const expense = {
      id: Date.now(),
      monthId: currentMonth,
      eglise: eglise,
      ...newExpense,
      voaray: voarayVal,
      amount: amountVal,
      ambiny: voarayVal - amountVal,
      sampana: newExpense.sampana || "",
      mpiandraikitra: newExpense.mpiandraikitra || "",
      sonia: ""
    };
    const currentList = await api.getDepenses(currentMonth);
    await api.saveDepenses(currentMonth, [...currentList, expense]);
    setNewExpense({ date: "", vote: "", comDate: "", reason: "", sampana: "", voaray: 0, amount: 0, mpiandraikitra: "", sonia: "" });
    await loadData();
    if (refreshAll) refreshAll();
    notifyExpensesUpdated();
  }

  async function handleUpdate(id, field, value) {
    let updateData = { [field]: value };
    if (field === 'date' || field === 'comDate') {
      if (value === "" || isValidDateStr(value)) updateData[field] = value;
      else { alert("Format date invalide (AAAA-MM-JJ)"); return; }
    }
    if (field === 'amount') {
      let newAmount = parseFloat(value);
      if (isNaN(newAmount)) newAmount = 0;
      if (newAmount > MAX_AMOUNT) { alert("Montant trop élevé"); return; }
      const expense = expenses.find(e => e.id === id);
      const newVoaray = expense?.voaray || 0;
      updateData.ambiny = newVoaray - newAmount;
    }
    if (field === 'voaray') {
      let newVoaray = parseFloat(value) || 0;
      const expense = expenses.find(e => e.id === id);
      const newAmount = expense?.amount || 0;
      updateData.ambiny = newVoaray - newAmount;
    }
    const updatedList = expenses.map(exp => exp.id === id ? { ...exp, ...updateData } : exp);
    await api.saveDepenses(currentMonth, updatedList);
    await loadData();
    if (refreshAll) refreshAll();
    notifyExpensesUpdated();
  }

  async function handleDelete(id) {
    if (window.confirm("Supprimer cette dépense ?")) {
      const updatedList = expenses.filter(exp => exp.id !== id);
      await api.saveDepenses(currentMonth, updatedList);
      await loadData();
      if (refreshAll) refreshAll();
      notifyExpensesUpdated();
    }
  }

  function handleVolaSisaChange(value) {
    let val = parseFloat(value);
    if (isNaN(val)) val = 0;
    setVolaSisaTeoAloha(val);
    localStorage.setItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`, val);
    notifyExpensesUpdated();
  }

  const volaSisa = volaNihiditra - totalExpenses + volaSisaTeoAloha;
  const displayEglise = capitalizeFirstLetter(eglise);
  const displayDistrict = capitalizeFirstLetter(district);
  const displayFederation = (federation || '').toUpperCase();
  const mois = formatMonthYear(currentMonth);
  const annee = currentMonth ? currentMonth.split('-')[0] : '';

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher les dépenses.</div>;

  return (
    <div>
      <div className="flex justify-end mb-2 no-print">
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
          <i className="fas fa-print"></i> Imprimer
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0.5cm 0.3cm; }
          body, .depenses-print { font-size: 8pt !important; }
          .no-print { display: none !important; }
          table { page-break-inside: avoid; }
          th, td { padding: 2px 3px !important; }
          input { border: none !important; background: transparent !important; }
        }
      `}</style>

      <div className="depenses-print">
        <div className="text-center">
          {displayFederation && <div className="font-bold text-lg uppercase mb-1">{displayFederation}</div>}
          <div className="font-bold text-lg">TATITRY NY VOLA NIVOAKA</div>
          <div className="text-sm italic">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA" (Ohab. 28:20a)</div>
        </div>

        <div className="flex justify-between items-start mt-1">
          <div className="text-left text-sm">
            <div><strong>DISTRIKA:</strong> {escapeHtml(displayDistrict)}</div>
            <div><strong>FIANGONANA:</strong> {escapeHtml(displayEglise)}</div>
            <div><strong>Volana:</strong> {mois.split(' ')[0]}</div>
            <div><strong>Taona:</strong> {annee}</div>
          </div>
          <div className="text-right">
            <table className="border border-black text-sm" style={{ marginLeft: 'auto', width: 'auto' }}>
              <tbody>
                <tr><td className="border p-1 font-semibold">Vola sisa teo aloha :</td><td className="border p-1 text-right"><input type="number" value={volaSisaTeoAloha} onChange={e => handleVolaSisaChange(e.target.value)} step="any" style={{ textAlign: 'right' }} /> Ar</td></tr>
                <tr><td className="border p-1 font-semibold">Vola nihiditra :</td><td className="border p-1 text-right">{formatNumber(volaNihiditra)} Ar</td></tr>
                <tr><td className="border p-1 font-semibold">Totalin'ny fandaniana :</td><td className="border p-1 text-right">{formatNumber(totalExpenses)} Ar</td></tr>
                <tr><td className="border p-1 font-semibold">Vola sisa :</td><td className="border p-1 text-right">{formatNumber(volaSisa)} Ar</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-x-auto mt-1">
          <table className="w-full text-sm border border-black">
            <thead className="bg-gray-100">
              <tr className="text-center">
                <th rowSpan="2" className="border p-1" style={{ width: '4%' }}>N°</th>
                <th rowSpan="2" className="border p-1" style={{ width: '8%' }}>Daty</th>
                <th colSpan="4" className="border p-1" style={{ width: '30%' }}>KOMITY</th>
                <th colSpan="3" className="border p-1" style={{ width: '22%' }}>Vola</th>
                <th colSpan="2" className="border p-1" style={{ width: '22%' }}>Mpiandraikitra & sonia</th>
                <th rowSpan="2" className="border p-1" style={{ width: '5%' }}>Action</th>
              </tr>
              <tr className="text-center">
                <th className="border p-1">Voty faha-</th>
                <th className="border p-1">Daty komity</th>
                <th className="border p-1">Antony</th>
                <th className="border p-1">Sampana</th>
                <th className="border p-1">Voaray</th>
                <th className="border p-1">Fandaniana</th>
                <th className="border p-1">Ambiny</th>
                <th className="border p-1">Mpiandraikitra</th>
                <th className="border p-1">Sonia</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, idx) => {
                const ambinyCalculated = (Number(exp.voaray) || 0) - (Number(exp.amount) || 0);
                return (
                  <tr key={exp.id}>
                    <td className="border p-1 text-center">{idx+1}</td>
                    <td className="border p-1"><input type="text" value={exp.date || ""} onChange={e => handleUpdate(exp.id, "date", e.target.value)} /></td>
                    <td className="border p-1"><input type="text" value={exp.vote || ""} onChange={e => handleUpdate(exp.id, "vote", e.target.value)} /></td>
                    <td className="border p-1"><input type="text" value={exp.comDate || ""} onChange={e => handleUpdate(exp.id, "comDate", e.target.value)} /></td>
                    <td className="border p-1"><input type="text" value={exp.reason || ""} onChange={e => handleUpdate(exp.id, "reason", e.target.value)} /></td>
                    <td className="border p-1">
                      <select value={exp.sampana || ""} onChange={e => handleUpdate(exp.id, "sampana", e.target.value)}>
                        <option value="">--</option>
                        {sampanaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </td>
                    <td className="border p-1 text-right"><input type="number" value={exp.voaray || 0} onChange={e => handleUpdate(exp.id, "voaray", e.target.value)} step="any" style={{ textAlign: 'right' }} /></td>
                    <td className="border p-1 text-right"><input type="number" value={exp.amount || 0} onChange={e => handleUpdate(exp.id, "amount", e.target.value)} step="any" style={{ textAlign: 'right' }} /></td>
                    <td className="border p-1 text-right">{formatNumber(ambinyCalculated)} Ar</td>
                    <td className="border p-1"><input type="text" value={exp.mpiandraikitra || ""} onChange={e => handleUpdate(exp.id, "mpiandraikitra", e.target.value)} placeholder="Nom" /></td>
                    <td className="border p-1"><input type="text" value={exp.sonia || ""} onChange={e => handleUpdate(exp.id, "sonia", e.target.value)} /></td>
                    <td className="border p-1 text-center"><button onClick={() => handleDelete(exp.id)} className="text-red-500"><i className="fas fa-trash"></i></button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan="7" className="border p-1 text-right font-bold">Total des dépenses :</td><td className="border p-1 font-bold text-right">{formatNumber(totalExpenses)} Ar</td><td className="border p-1"></td><td className="border p-1"></td><td className="border p-1"></td></tr>
            </tfoot>
          </table>
        </div>

        <div className="grid grid-cols-4 gap-1 mt-0.5 pt-0 signatures-grid">
          <div className="signature-block">Mpitam-bola mpanampy:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Mpitam-bola:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Loholona:<br/><br/>_______________<br/>(sonia)</div>
          <div className="signature-block">Pasteur:<br/><br/>_______________<br/>(sonia)</div>
        </div>
        <div className="mt-1 text-right text-sm">Arrêté à la somme de Ariary: <i>{nombreEnLettresCapitalized(totalExpenses)} Ar.</i></div>
      </div>

      <div className="mt-3 no-print grid md:grid-cols-9 gap-2 bg-gray-50 p-3 rounded-lg">
        <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} className="border p-1 rounded" />
        <input type="text" value={newExpense.vote} onChange={e => setNewExpense({ ...newExpense, vote: e.target.value })} placeholder="Voty faha" className="border p-1 rounded" />
        <input type="date" value={newExpense.comDate} onChange={e => setNewExpense({ ...newExpense, comDate: e.target.value })} className="border p-1 rounded" />
        <input type="text" value={newExpense.reason} onChange={e => setNewExpense({ ...newExpense, reason: e.target.value })} placeholder="Antony" className="border p-1 rounded" />
        <select value={newExpense.sampana} onChange={e => setNewExpense({ ...newExpense, sampana: e.target.value })} className="border p-1 rounded"><option value="">Sampana</option>{sampanaOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
        <input type="number" value={newExpense.voaray} onChange={e => setNewExpense({ ...newExpense, voaray: e.target.value })} placeholder="Voaray (Ar)" className="border p-1 rounded" />
        <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="Fandaniana (Ar)" className="border p-1 rounded" />
        <input type="text" value={newExpense.mpiandraikitra} onChange={e => setNewExpense({ ...newExpense, mpiandraikitra: e.target.value })} placeholder="Mpiandraikitra" className="border p-1 rounded" />
        <button onClick={handleAdd} className="bg-blue-600 text-white px-4 py-1 rounded"><i className="fas fa-plus"></i> Ajouter</button>
      </div>
    </div>
  );
}