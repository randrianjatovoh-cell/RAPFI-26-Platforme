// src/components/RapportComite.js
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

export default function RapportComite({ currentMonth, selectedEglise }) {
  const { user } = useUser();
  const [eglise, setEglise] = useState(selectedEglise || user?.eglise || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [federation, setFederation] = useState(user?.federation || '');
  const [report, setReport] = useState(null);
  const [totalsByCategory, setTotalsByCategory] = useState({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0 });
  const [b9Total, setB9Total] = useState(0);
  const [b10Total, setB10Total] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [frais, setFrais] = useState(0);
  const [openingChurch, setOpeningChurch] = useState(0);
  const [closingBalanceChurch, setClosingBalanceChurch] = useState(0);
  const [closingBalanceSpecial, setClosingBalanceSpecial] = useState(0);
  const [loading, setLoading] = useState(true);
  const [references, setReferences] = useState(() => {
    const saved = localStorage.getItem(`references_${currentMonth}_${eglise}`);
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { return Array(6).fill({ date: '', soraBola: '', rosia: '' }); }
    }
    return Array(6).fill({ date: '', soraBola: '', rosia: '' });
  });

  const updateReference = (index, field, value) => {
    const newRefs = [...references];
    newRefs[index] = { ...newRefs[index], [field]: value };
    setReferences(newRefs);
    localStorage.setItem(`references_${currentMonth}_${eglise}`, JSON.stringify(newRefs));
  };

  async function loadData() {
    if (!currentMonth || !eglise) return;
    setLoading(true);
    try {
      const r = await api.getMonthlyReport(currentMonth, eglise);
      setReport(r);
      if (r && r.soraBolaLinesJson) {
        try {
          const soraBolaArray = JSON.parse(r.soraBolaLinesJson);
          if (Array.isArray(soraBolaArray) && soraBolaArray.length >= 5) {
            const updatedRefs = [...references];
            for (let i=0;i<5;i++) updatedRefs[i] = { ...updatedRefs[i], soraBola: soraBolaArray[i] || '' };
            setReferences(updatedRefs);
            localStorage.setItem(`references_${currentMonth}_${eglise}`, JSON.stringify(updatedRefs));
          }
        } catch(e) { console.warn(e); }
      }

      const glData = await api.getGL(currentMonth) || {};
      const categoryTotals = { f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0 };
      let b9=0, b10=0;
      for (let s=1; s<=5; s++) {
        const entries = glData[s] || [];
        for (const entry of entries) {
          categoryTotals.f1 += entry.f1||0; categoryTotals.f2 += entry.f2||0;
          categoryTotals.f3 += entry.f3||0; categoryTotals.f4 += entry.f4||0;
          categoryTotals.f5 += entry.f5||0; categoryTotals.f6 += entry.f6||0;
          categoryTotals.f7 += entry.f7||0; categoryTotals.f8 += entry.f8||0;
          b9 += entry.b9||0; b10 += entry.b10||0;
        }
      }
      setTotalsByCategory(categoryTotals);
      setB9Total(b9); setB10Total(b10);

      const expensesList = await api.getDepenses(currentMonth);
      const total = expensesList.reduce((s,e) => s + (Number(e.amount)||0), 0);
      setTotalExpenses(total);

      const fraisVal = await api.getFrais(currentMonth, eglise);
      setFrais(fraisVal);

      const savedOpening = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
      const opening = savedOpening ? parseFloat(savedOpening) : 0;
      setOpeningChurch(opening);
      setClosingBalanceChurch(opening + b9 - total);
      setClosingBalanceSpecial(0 + b10);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    setEglise(selectedEglise || user?.eglise || '');
    setDistrict(user?.district || '');
    setFederation(user?.federation || '');
  }, [selectedEglise, user]);

  useEffect(() => {
    const handleExpensesUpdate = () => loadData();
    window.addEventListener('expenses-updated', handleExpensesUpdate);
    return () => window.removeEventListener('expenses-updated', handleExpensesUpdate);
  }, [currentMonth, eglise]);

  useEffect(() => {
    if (currentMonth && eglise) loadData();
  }, [currentMonth, eglise]);

  useEffect(() => {
    if (currentMonth && eglise) {
      const saved = localStorage.getItem(`references_${currentMonth}_${eglise}`);
      if (saved) try { setReferences(JSON.parse(saved)); } catch(e) {}
      else setReferences(Array(6).fill({ date: '', soraBola: '', rosia: '' }));
    }
  }, [currentMonth, eglise]);

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;
  if (!report) return <div className="text-center p-4">Aucun rapport pour ce mois.</div>;

  const displayEglise = capitalizeFirstLetter(eglise);
  const displayDistrict = capitalizeFirstLetter(district);
  const displayFederation = (federation || '').toUpperCase();
  const mois = formatMonthYear(currentMonth).split(' ')[0];
  const annee = currentMonth.split('-')[0];
  const totalA = totalsByCategory.f1+totalsByCategory.f2+totalsByCategory.f3+totalsByCategory.f4+totalsByCategory.f5+totalsByCategory.f6+totalsByCategory.f7+totalsByCategory.f8;
  const totalB = b9Total + b10Total;
  const categories = [
    { label: "Ampahafolony", key: "f1" }, { label: "Sekoly Sabata/S. faha-13", key: "f2" },
    { label: "Fanambinana", key: "f3" }, { label: "Tsingerin-taona", key: "f4" },
    { label: "Fanompoam-pivavahana", key: "f5" }, { label: "Federasiona", key: "f6" },
    { label: "Maneran-tany", key: "f7" }, { label: "Manokana", key: "f8" }
  ];
  const rowValues = categories.map(c => totalsByCategory[c.key] || 0);
  const sumForRapaoro = rowValues[1] + rowValues[2] + rowValues[3] + rowValues[4];

  return (
    <div className="p-2 print-container">
      <style>{`@media print{@page{size:A4 landscape;margin:0.2cm}.no-print{display:none}body,.print-container{font-size:10pt!important}.border,.border-black{border-color:#000!important;border-width:0.4pt!important}th,td{padding:1px 2px!important}input{border:none!important;background:transparent!important}}`}</style>
      <div className="flex justify-end mb-2 no-print"><button onClick={()=>window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">🖨️ Imprimer</button></div>
      <div className="text-center mb-4"><div className="font-bold text-lg">FIANGONANA ADVANTISTA MITANDRINA NY ANDRO FAHAFITO</div>{displayFederation && <div className="font-bold text-md uppercase">{displayFederation}</div>}<div className="font-bold uppercase text-md">SAMPANA FANAMARINANA KAONTY</div><div className="font-bold text-xl underline mt-2">TATITRA ARA-BOLA HO AN'NY KOMITY SY NY FIANGONANA</div></div>
      <div className="mb-4 text-sm" style={{lineHeight:'1.2'}}><div className="grid grid-cols-3"><div><strong>FIANGONANA:</strong> {escapeHtml(displayEglise)}</div><div className="text-center"><strong>VOLANA:</strong> {mois}</div><div className="text-right"><strong>DATY NANAOVANA NY FIVORIANA:</strong> ____/____/____</div></div><div className="grid grid-cols-3" style={{marginTop:0}}><div><strong>DISTRIKA:</strong> {escapeHtml(displayDistrict)}</div><div className="text-center"><strong>TAONA:</strong> {annee}</div><div className="text-right"><strong>ISAN'NY TONGA:</strong> _______</div></div></div>
      <div className="overflow-x-auto"><table className="w-full text-sm border border-black"><thead><tr className="bg-gray-100"><th colSpan="3" className="border p-1 bg-blue-100">VOLA NAROTSAKA TANY AMIN'NY FEDERASIONA</th><th className="separator-col p-1 bg-white" style={{width:'20px',border:'none'}}></th><th colSpan="4" className="border p-1 bg-green-100">TOE-BOLAN'NY FIANGONANA EO AN-TOERANA</th></tr><tr className="text-center"><th className="border p-1">ANTONY</th><th className="border p-1">TONTALINY</th><th className="border p-1">RAPAORO</th><th className="separator-col p-1" style={{border:'none'}}></th><th className="border p-1">ANTONY</th><th className="border p-1">FIANGONANA</th><th className="border p-1">MANOKANA</th><th className="border p-1">TONTALINY</th></tr></thead><tbody>
        <tr><td className="border p-1">Ampahafolony</td><td className="border p-1 text-right">{formatNumber(rowValues[0])}</td><td className="border p-1 text-right">{formatNumber(rowValues[0])}</td><td className="separator-col p-1" style={{border:'none'}}></td><td className="border p-1">VOLA SISA tamin'ny volana teo aloha</td><td className="border p-1 text-right">{formatNumber(openingChurch)}</td><td className="border p-1 text-right bg-gray-100"></td><td className="border p-1 text-right">{formatNumber(openingChurch)}</td></tr>
        <tr><td className="border p-1">Sekoly Sabata/S. faha-13</td><td className="border p-1 text-right">{formatNumber(rowValues[1])}</td><td rowSpan="4" className="border p-1 text-right align-middle">{formatNumber(sumForRapaoro)}</td><td rowSpan="4" className="separator-col p-1" style={{border:'none'}}></td><td className="border p-1">VOLA NIDITRA nandritra ny volana</td><td className="border p-1 text-right">{formatNumber(b9Total)}</td><td className="border p-1 text-right">{formatNumber(b10Total)}</td><td className="border p-1 text-right">{formatNumber(b9Total+b10Total)}</td></tr>
        <tr><td className="border p-1">Fanambinana</td><td className="border p-1 text-right">{formatNumber(rowValues[2])}</td><td className="border p-1">VOLA NIVOAKA nandritra ny volana</td><td className="border p-1 text-right">{formatNumber(totalExpenses)}</td><td className="border p-1 text-right"> </td><td className="border p-1 text-right">{formatNumber(totalExpenses)}</td></tr>
        <tr><td className="border p-1">Tsingerin-taona</td><td className="border p-1 text-right">{formatNumber(rowValues[3])}</td><td className="border p-1">VOLA SISA tamin'ny faran'ny volana</td><td className="border p-1 text-right">{formatNumber(closingBalanceChurch)}</td><td className="border p-1 text-right">{formatNumber(closingBalanceSpecial)}</td><td className="border p-1 text-right">{formatNumber(closingBalanceChurch+closingBalanceSpecial)}</td></tr>
        <tr><td className="border p-1">Fanompoam-pivavahana</td><td className="border p-1 text-right">{formatNumber(rowValues[4])}</td><td colSpan="4" className="border p-1 text-center">Sonian'ireo mambra ao amin'ny Komity :</td></tr>
        <tr><td className="border p-1">Federasiona</td><td className="border p-1 text-right">{formatNumber(rowValues[5])}</td><td className="border p-1 text-right">{formatNumber(rowValues[5])}</td><td className="separator-col p-1" style={{border:'none'}}></td><td rowSpan="3" colSpan="4" className="border p-1 signatures-cell" style={{verticalAlign:'top'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}><div><strong>Ny Mpitahiry vola :</strong></div><div style={{textAlign:'center'}}><strong>Ny Mpitahiry vola mpanampy :</strong></div><div style={{textAlign:'right'}}><strong>Ireo Loholona na Tale :</strong></div></div></td></tr>
        <tr><td className="border p-1">Maneran-tany</td><td className="border p-1 text-right">{formatNumber(rowValues[6])}</td><td className="border p-1 text-right">{formatNumber(rowValues[6])}</td><td className="separator-col p-1" style={{border:'none'}}></td></tr>
        <tr><td className="border p-1">Manokana</td><td className="border p-1 text-right">{formatNumber(rowValues[7])}</td><td className="border p-1 text-right">{formatNumber(rowValues[7])}</td><td className="separator-col p-1" style={{border:'none'}}></td></tr>
        <tr className="font-bold"><td className="border p-1">TONTALIN'NY VOLA MIAKATRA any @ FME</td><td className="border p-1 text-right">{formatNumber(totalA)}</td><td className="border p-1 text-right">{formatNumber(totalA)}</td><td className="separator-col p-1" style={{border:'none'}}></td><td rowSpan="4" colSpan="4" className="border p-1 relative" style={{minHeight:'60px'}}><div className="absolute top-0 left-0"><strong>Ireo mambran'ny Komity (Sonia sy anarana) :</strong></div><div className="absolute top-1/2 right-0 transform -translate-y-1/2"><strong>Ny Pasitora :</strong></div></td></tr>
        <tr className="font-bold"><td className="border p-1">Volam-piangonana apetraka any @ FME</td><td className="border p-1 text-right">{formatNumber(totalA - frais)}</td><td className="border p-1 text-right">{formatNumber(totalA - frais)}</td><td className="separator-col p-1" style={{border:'none'}}></td></tr>
        <tr className="font-bold"><td className="border p-1">Saram-pandefasana</td><td className="border p-1 text-right">{formatNumber(frais)}</td><td className="border p-1 text-right">{formatNumber(frais)}</td><td className="separator-col p-1" style={{border:'none'}}></td></tr>
        <tr className="font-bold bg-gray-50"><td className="border p-1">TONTALIN'NY VOLA HAROTSAKA ANY @ FME</td><td className="border p-1 text-right">{formatNumber(totalA - frais)}</td><td className="border p-1 text-right">{formatNumber(totalA - frais)}</td><td className="separator-col p-1" style={{border:'none'}}></td></tr>
      </tbody></table></div>
      <div className="mt-6"><table className="w-full text-sm border border-black"><thead><tr className="bg-gray-100"><th className="border p-1" style={{width:'33%'}}>Daty nanaovana ny rotsa-bola</th><th className="border p-1" style={{width:'33%'}}>Sora-bola</th><th className="border p-1" style={{width:'34%'}}>Nomeraon'ny Rosia (référence)</th></tr></thead><tbody>{references.map((ref,idx)=><tr key={idx}><td className="border p-1"><input type="date" value={ref.date} onChange={e=>updateReference(idx,'date',e.target.value)} className="w-full" style={{textAlign:'left'}}/></td><td className="border p-1"><input type="text" value={ref.soraBola} onChange={e=>updateReference(idx,'soraBola',e.target.value)} className="w-full" style={{textAlign:'right'}}/></td><td className="border p-1"><input type="text" value={ref.rosia} onChange={e=>updateReference(idx,'rosia',e.target.value)} className="w-full" style={{textAlign:'left'}}/></td></tr>)}</tbody></table></div>
      <div className="mt-2 text-xs"><strong>Fanamarihana:</strong> Ny mpitahiry volan'ny Fiangonana dia manao tatitra ara-bola isam-bolana</div>
    </div>
  );
}