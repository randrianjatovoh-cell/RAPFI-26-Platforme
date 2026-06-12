// src/components/RapportAnnuel.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatNumber, escapeHtml } from '../services/helpers';

const MONTHS_LIST = [
  { id: '01', name: 'Janvier', english: 'January' },
  { id: '02', name: 'Février', english: 'February' },
  { id: '03', name: 'Mars', english: 'March' },
  { id: '04', name: 'Avril', english: 'April' },
  { id: '05', name: 'Mai', english: 'May' },
  { id: '06', name: 'Juin', english: 'June' },
  { id: '07', name: 'Juillet', english: 'July' },
  { id: '08', name: 'Août', english: 'August' },
  { id: '09', name: 'Septembre', english: 'September' },
  { id: '10', name: 'Octobre', english: 'October' },
  { id: '11', name: 'Novembre', english: 'November' },
  { id: '12', name: 'Décembre', english: 'December' }
];

export default function RapportAnnuel({ user: propUser, readOnly = false }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState(() => {
    return MONTHS_LIST.map((month, idx) => ({
      monthId: `${selectedYear}-${month.id}`,
      monthName: month.english,
      monthFrench: month.name,
      tithe: 0, fanatitra: 0, totalA: 0, receiptNumber: '', income: 0, expenses: 0, note: '', balance: 0
    }));
  });
  const [annualTotals, setAnnualTotals] = useState({ totalTithe:0, totalFanatitra:0, totalA:0, totalIncome:0, totalExpenses:0 });
  const [endOfYear, setEndOfYear] = useState({ previousBalance:0, totalIncomeYear:0, totalExpensesYear:0, carriedForward:0 });
  const [signatures, setSignatures] = useState({
    treasurer: { name: '', email: '', tel: '' },
    assistantTreasurer1: { name: '', email: '', tel: '' },
    assistantTreasurer2: { name: '', email: '', tel: '' },
    elderInCharge: { name: '', email: '', tel: '' }
  });

  const federationName = user?.federation || 'FEDERASIONA MADAGASIKARA';

  useEffect(() => {
    if (user && user.eglise) loadYearlyData();
  }, [selectedYear, user]);

  async function loadYearlyData() {
    setLoading(true);
    try {
      const updatedMonthlyData = [...monthlyData];
      for (let i=0; i<MONTHS_LIST.length; i++) {
        const month = MONTHS_LIST[i];
        const monthKey = `${selectedYear}-${month.id}`;
        const glData = await api.getGL(monthKey) || {};
        let tithe = 0, fanatitra = 0, income = 0;
        for (let s=1; s<=5; s++) {
          const entries = glData[s] || [];
          for (const e of entries) {
            tithe += e.f1 || 0;
            fanatitra += (e.f2||0)+(e.f3||0)+(e.f4||0)+(e.f5||0)+(e.f6||0)+(e.f7||0)+(e.f8||0);
            income += e.b9 || 0;
          }
        }
        const expensesList = await api.getDepenses(monthKey);
        const totalExpenses = expensesList.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const existingReport = await api.getMonthlyReport(monthKey, user.eglise);
        updatedMonthlyData[i].tithe = tithe;
        updatedMonthlyData[i].fanatitra = fanatitra;
        updatedMonthlyData[i].totalA = tithe + fanatitra;
        updatedMonthlyData[i].income = income;
        updatedMonthlyData[i].expenses = totalExpenses;
        updatedMonthlyData[i].balance = income - totalExpenses;
        if (existingReport) {
          updatedMonthlyData[i].receiptNumber = existingReport.receiptNumber || '';
          updatedMonthlyData[i].note = existingReport.note || '';
        }
      }
      setMonthlyData(updatedMonthlyData);
      computeAnnualTotals(updatedMonthlyData);
      await loadSavedSignatures();
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadSavedSignatures() {
    try {
      const savedData = await api.getMonthlyReport(`${selectedYear}-01`, user.eglise);
      if (savedData && savedData.signatures) setSignatures(JSON.parse(savedData.signatures));
      if (savedData && savedData.endOfYear) {
        const eoy = JSON.parse(savedData.endOfYear);
        setEndOfYear(prev => ({ ...prev, previousBalance: eoy.previousBalance || 0, carriedForward: (eoy.previousBalance || 0) + prev.totalIncomeYear - prev.totalExpensesYear }));
      }
    } catch(err) { console.error(err); }
  }

  function computeAnnualTotals(data) {
    const totals = data.reduce((acc, month) => ({
      totalTithe: acc.totalTithe + (month.tithe || 0),
      totalFanatitra: acc.totalFanatitra + (month.fanatitra || 0),
      totalA: acc.totalA + (month.totalA || 0),
      totalIncome: acc.totalIncome + (month.income || 0),
      totalExpenses: acc.totalExpenses + (month.expenses || 0)
    }), { totalTithe:0, totalFanatitra:0, totalA:0, totalIncome:0, totalExpenses:0 });
    setAnnualTotals(totals);
    setEndOfYear(prev => ({ ...prev, totalIncomeYear: totals.totalIncome, totalExpensesYear: totals.totalExpenses, carriedForward: prev.previousBalance + totals.totalIncome - totals.totalExpenses }));
  }

  async function updateReceiptNumber(monthIndex, value) {
    if (readOnly) return;
    const newData = [...monthlyData];
    newData[monthIndex].receiptNumber = value;
    setMonthlyData(newData);
    await api.updateReportField(newData[monthIndex].monthId, user.eglise, 'receiptNumber', value);
  }

  async function updateNote(monthIndex, value) {
    if (readOnly) return;
    const newData = [...monthlyData];
    newData[monthIndex].note = value;
    setMonthlyData(newData);
    await api.updateReportField(newData[monthIndex].monthId, user.eglise, 'note', value);
  }

  async function updatePreviousBalance(value) {
    if (readOnly) return;
    const newBalance = parseInt(value) || 0;
    setEndOfYear(prev => ({ ...prev, previousBalance: newBalance, carriedForward: newBalance + prev.totalIncomeYear - prev.totalExpensesYear }));
    await api.updateReportField(`${selectedYear}-01`, user.eglise, 'endOfYear', JSON.stringify({ previousBalance: newBalance }));
  }

  async function updateSignature(field, subField, value) {
    if (readOnly) return;
    const newSignatures = { ...signatures };
    newSignatures[field][subField] = value;
    setSignatures(newSignatures);
    await api.updateReportField(`${selectedYear}-01`, user.eglise, 'signatures', JSON.stringify(newSignatures));
  }

  const availableYears = [2026,2027,2028,2029,2030];
  if (loading) return <div className="text-center p-4">Chargement du rapport annuel...</div>;

  return (
    <div className="rapport-annuel-container p-1 font-sans text-sm">
      <style>{`@media print{@page{size:A4 landscape;margin:0.1cm}body,.rapport-annuel-container{margin:0;padding:0}.no-print{display:none!important}table,th,td{page-break-inside:avoid!important}.border,.border-b,.border-t{border-color:#000!important;border-width:0.3pt!important}th,td{padding:1px 2px!important;font-size:8pt!important}input{border:none!important;background:transparent!important}}`}</style>
      <div className="flex justify-between items-center mb-1 no-print"><div className="flex items-center gap-2"><label className="font-semibold text-sm">Année:</label><select value={selectedYear} onChange={e=>setSelectedYear(parseInt(e.target.value))} className="border rounded p-0.5 bg-white text-sm">{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div><button onClick={()=>window.print()} className="bg-gray-700 text-white px-2 py-0.5 rounded text-sm">🖨️ Imprimer</button></div>
      <div className="text-center leading-tight"><h1 className="text-lg font-bold uppercase">{federationName}</h1><h2 className="text-base font-semibold">SAMPANA FANAMARINANA KAONTY</h2><h3 className="text-sm font-bold bg-gray-100 inline-block px-2">TATITRA ARA-BOLAN'NY FIANGONANA TAONA {selectedYear}</h3><p className="text-xs"><strong>Fiangonana :</strong> {user?.eglise || 'Atsinana'}</p></div>
      <div className="overflow-x-auto border mb-1"><table className="w-full border-collapse text-xs"><thead><tr className="bg-gray-200"><th rowSpan="2" className="border p-0.5 align-middle" style={{width:'7%'}}>VOLANA</th><th colSpan="4" className="border p-0.5 text-center" style={{width:'45%'}}>A - VOLA NAROTSAKA ATY AMIN'NY FOIBE FEDERASIONA</th><th colSpan="3" className="border p-0.5 text-center" style={{width:'48%'}}>B - VOLA NAROTSAKA HO AN'NY FIANGONANA</th></tr><tr className="bg-gray-100"><th className="border p-0.5">Ampahafolony</th><th className="border p-0.5">Fanatitra</th><th className="border p-0.5">TONTALINY</th><th className="border p-0.5">N° Rosia sy ny daty nadrotsahana</th><th className="border p-0.5">Vola Niditra</th><th className="border p-0.5">Vola Nivoaka</th><th className="border p-0.5">Fanamarihana</th></tr></thead><tbody>{monthlyData.map((month,idx)=><tr key={month.monthId}><td className="border p-0.5 font-semibold text-left">{month.monthFrench}</td><td className="border p-0.5 text-right">{formatNumber(month.tithe)}</td><td className="border p-0.5 text-right">{formatNumber(month.fanatitra)}</td><td className="border p-0.5 text-right font-bold bg-gray-50">{formatNumber(month.totalA)}</td><td className="border p-0.5"><input type="text" value={month.receiptNumber||''} onChange={e=>updateReceiptNumber(idx,e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5 text-right">{formatNumber(month.income)}</td><td className="border p-0.5 text-right">{formatNumber(month.expenses)}</td><td className="border p-0.5"><input type="text" value={month.note||''} onChange={e=>updateNote(idx,e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td></tr>)}<tr className="bg-gray-200 font-bold"><td className="border p-0.5">TONTALINY</td><td className="border p-0.5 text-right">{formatNumber(annualTotals.totalTithe)}</td><td className="border p-0.5 text-right">{formatNumber(annualTotals.totalFanatitra)}</td><td className="border p-0.5 text-right">{formatNumber(annualTotals.totalA)}</td><td className="border p-0.5 text-center">-</td><td className="border p-0.5 text-right">{formatNumber(annualTotals.totalIncome)}</td><td className="border p-0.5 text-right">{formatNumber(annualTotals.totalExpenses)}</td><td className="border p-0.5 text-center">-</td></tr></tbody></table></div>
      <div className="border mb-1"><h4 className="font-bold text-center py-0.5 bg-gray-100 border-b text-xs">TOE-BOLA FARAN'NY TAONA {selectedYear} (FEHINY)</h4><table className="w-full border-collapse text-xs"><tbody><tr><td className="border p-0.5 font-semibold w-2/5">VOLA SISA TEO ALOHA ({selectedYear-1})</td><td className="border p-0.5 w-1/5"><input type="number" value={endOfYear.previousBalance===0?'':endOfYear.previousBalance} onChange={e=>updatePreviousBalance(e.target.value)} className="w-full text-right border rounded px-0 py-0 text-xs" disabled={readOnly} placeholder=""/></td><td className="border p-0.5 w-2/5 bg-gray-50" rowSpan="4"></td></tr><tr><td className="border p-0.5 font-semibold">VOLA NIDITRA TAO ANATIN'NY TAONA ({selectedYear})</td><td className="border p-0.5 text-right">{formatNumber(endOfYear.totalIncomeYear)} Ar</td></tr><tr><td className="border p-0.5 font-semibold">VOLA NIVOAKA TAO ANATIN'NY TAONA ({selectedYear})</td><td className="border p-0.5 text-right">{formatNumber(endOfYear.totalExpensesYear)} Ar</td></tr><tr><td className="border p-0.5 font-semibold">TONTALIN'NY VOLA AFINDRA HO AMIN'NY TAONA MANARAKA ({selectedYear+1})</td><td className="border p-0.5 text-right font-bold">{formatNumber(endOfYear.carriedForward)} Ar</td></tr></tbody></table></div>
      <div className="border mb-1"><h4 className="font-bold text-center py-0.5 bg-gray-100 border-b text-xs">ANARAN'IREO MPIARA-MIASA NANDRITRA NY TAONA {selectedYear}</h4><table className="w-full border-collapse text-xs"><thead><tr className="bg-gray-50"><th className="border p-0.5 w-1/4">Fonction</th><th className="border p-0.5 w-1/4">Nom et Prénom</th><th className="border p-0.5 w-1/4">Adresse e-mail</th><th className="border p-0.5 w-1/4">Tél</th></tr></thead><tbody><tr><td className="border p-0.5 font-semibold">Ny Mpitahiry vola:</td><td className="border p-0.5"><input type="text" value={signatures.treasurer.name} onChange={e=>updateSignature('treasurer','name',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="email" value={signatures.treasurer.email} onChange={e=>updateSignature('treasurer','email',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="tel" value={signatures.treasurer.tel} onChange={e=>updateSignature('treasurer','tel',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td></tr><tr><td className="border p-0.5 font-semibold">Ny Mpitahiry vola Mpanampy:</td><td className="border p-0.5"><input type="text" value={signatures.assistantTreasurer1.name} onChange={e=>updateSignature('assistantTreasurer1','name',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="email" value={signatures.assistantTreasurer1.email} onChange={e=>updateSignature('assistantTreasurer1','email',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="tel" value={signatures.assistantTreasurer1.tel} onChange={e=>updateSignature('assistantTreasurer1','tel',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td></tr><tr><td className="border p-0.5 font-semibold">Ny Mpitahiry vola Mpanampy:</td><td className="border p-0.5"><input type="text" value={signatures.assistantTreasurer2.name} onChange={e=>updateSignature('assistantTreasurer2','name',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="email" value={signatures.assistantTreasurer2.email} onChange={e=>updateSignature('assistantTreasurer2','email',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="tel" value={signatures.assistantTreasurer2.tel} onChange={e=>updateSignature('assistantTreasurer2','tel',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td></tr><tr><td className="border p-0.5 font-semibold">Loholona miadidy ny vola:</td><td className="border p-0.5"><input type="text" value={signatures.elderInCharge.name} onChange={e=>updateSignature('elderInCharge','name',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="email" value={signatures.elderInCharge.email} onChange={e=>updateSignature('elderInCharge','email',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td><td className="border p-0.5"><input type="tel" value={signatures.elderInCharge.tel} onChange={e=>updateSignature('elderInCharge','tel',e.target.value)} className="w-full border-none px-0 py-0 text-xs" disabled={readOnly}/></td></tr></tbody></table></div>
      <div className="text-xs italic py-0.5 leading-tight no-border-print">NB: Atao dika telo (03) mitovy ity ka: 1/-Sampana fanamarinan-kaonty; 2/-Pasitoran'ny Distrika; 3/-Tahiry ho an'ny fiangonana (mijanona).</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 text-center text-xs pt-1 signature-line"><div className="font-semibold underline">Ireo Mpitahiry Vola</div><div className="font-semibold underline">Ny Loholona na Tale</div><div className="font-semibold underline">Ny Komity</div><div className="font-semibold underline">Ny Pasitoran'ny Distrika</div></div>
    </div>
  );
}