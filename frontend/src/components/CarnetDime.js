// src/components/CarnetDime.js
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { escapeHtml, formatNumber, capitalizeFirstLetter } from '../services/helpers';

const MONTHS = ['JAN', 'FEV', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];

export default function CarnetDime({ selectedEglise, currentMonth }) {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalDime: new Array(12).fill(0),
    offCombine: new Array(12).fill(0),
    frais: new Array(12).fill(0),
    totalVers: new Array(12).fill(0),
    pourcentOffDime: new Array(12).fill(0)
  });
  const [totalAnnualStats, setTotalAnnualStats] = useState({ totalDime: 0, offCombine: 0, frais: 0, totalVers: 0, pourcentOffDime: 0 });
  const [nbrMembres, setNbrMembres] = useState(() => {
    const key = `carnetDime_nbrMembres_${selectedEglise || user?.eglise}_${currentMonth?.split('-')[0] || new Date().getFullYear()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 12) return parsed.map(v => (typeof v === 'number' ? v : 0));
      } catch(e) {}
    }
    return new Array(12).fill(0);
  });

  const [offParPerso, setOffParPerso] = useState(new Array(12).fill(0));
  const [totalOffParPerso, setTotalOffParPerso] = useState(0);

  const eglise = selectedEglise || user?.eglise || '';
  let annee = new Date().getFullYear();
  if (currentMonth && currentMonth.includes('-')) annee = currentMonth.split('-')[0];

  useEffect(() => {
    if (eglise) loadYearlyData();
  }, [eglise, annee]);

  useEffect(() => {
    const key = `carnetDime_nbrMembres_${eglise}_${annee}`;
    localStorage.setItem(key, JSON.stringify(nbrMembres));
    recalcOffParPerso();
  }, [nbrMembres]);

  useEffect(() => {
    if (monthlyStats.totalDime && monthlyStats.offCombine) recalcOffParPerso();
  }, [monthlyStats]);

  function recalcOffParPerso() {
    const safeNbr = Array.isArray(nbrMembres) ? nbrMembres : new Array(12).fill(0);
    const newOffParPerso = [];
    for (let i = 0; i < 12; i++) {
      const totalDime = monthlyStats.totalDime[i] || 0;
      const offCombine = monthlyStats.offCombine[i] || 0;
      const nbr = safeNbr[i] || 0;
      newOffParPerso[i] = (nbr === 0) ? 0 : (totalDime + offCombine) / nbr;
    }
    setOffParPerso(newOffParPerso);
    const sumDime = monthlyStats.totalDime.reduce((a,b)=>a+b,0);
    const sumOff = monthlyStats.offCombine.reduce((a,b)=>a+b,0);
    const sumNbr = safeNbr.reduce((a,b)=>a+b,0);
    setTotalOffParPerso(sumNbr===0 ? 0 : (sumDime+sumOff)/sumNbr);
  }

  async function loadYearlyData() {
    setLoading(true);
    try {
      const membersMap = new Map();
      let totalDimeMois = new Array(12).fill(0);
      let offCombineMois = new Array(12).fill(0);
      let fraisMois = new Array(12).fill(0);

      for (let i = 0; i < 12; i++) {
        const monthKey = `${annee}-${String(i+1).padStart(2,'0')}`;
        const glData = await api.getGL(monthKey) || {};
        let moisDime = 0, moisOffCombine = 0;
        for (let s=1; s<=5; s++) {
          const entries = glData[s] || [];
          for (const entry of entries) {
            const memberName = entry.memberName || 'Anonyme';
            const dime = entry.f1 || 0;
            moisDime += dime;
            const off = (entry.f2||0)+(entry.f3||0)+(entry.f4||0)+(entry.f5||0)+(entry.f6||0)+(entry.f7||0)+(entry.f8||0);
            moisOffCombine += off;
            if (!membersMap.has(memberName)) membersMap.set(memberName, new Array(12).fill(0));
            membersMap.get(memberName)[i] += dime;
          }
        }
        totalDimeMois[i] = moisDime;
        offCombineMois[i] = moisOffCombine;
        const fraisVal = await api.getFrais(monthKey, eglise);
        fraisMois[i] = fraisVal;
      }

      const membersList = [];
      for (const [name, monthAmounts] of membersMap.entries()) {
        const total = monthAmounts.reduce((sum, val) => sum + val, 0);
        membersList.push({ name, monthly: monthAmounts, total });
      }
      membersList.sort((a,b) => b.total - a.total);
      setMembers(membersList);

      const totalVersMois = new Array(12);
      const pourcentOffDimeMois = new Array(12);
      for (let i=0;i<12;i++) {
        const td = totalDimeMois[i], off = offCombineMois[i], frais = fraisMois[i];
        totalVersMois[i] = td + off - frais;
        pourcentOffDimeMois[i] = td===0 ? 0 : (off*100)/td;
      }
      setMonthlyStats({ totalDime: totalDimeMois, offCombine: offCombineMois, frais: fraisMois, totalVers: totalVersMois, pourcentOffDime: pourcentOffDimeMois });

      const totalAnnualDime = totalDimeMois.reduce((a,b)=>a+b,0);
      const totalAnnualOffCombine = offCombineMois.reduce((a,b)=>a+b,0);
      const totalAnnualFrais = fraisMois.reduce((a,b)=>a+b,0);
      const totalAnnualVers = totalAnnualDime + totalAnnualOffCombine - totalAnnualFrais;
      const totalAnnualPourcent = totalAnnualDime===0 ? 0 : (totalAnnualOffCombine*100)/totalAnnualDime;
      setTotalAnnualStats({ totalDime: totalAnnualDime, offCombine: totalAnnualOffCombine, frais: totalAnnualFrais, totalVers: totalAnnualVers, pourcentOffDime: totalAnnualPourcent });

      const key = `carnetDime_nbrMembres_${eglise}_${annee}`;
      const saved = localStorage.getItem(key);
      if (!saved) {
        const nbrInit = new Array(12).fill(0);
        for (let i=0;i<12;i++) {
          const monthKey = `${annee}-${String(i+1).padStart(2,'0')}`;
          const glData = await api.getGL(monthKey) || {};
          const membresSet = new Set();
          for (let s=1;s<=5;s++) {
            for (const entry of (glData[s]||[])) {
              const name = entry.memberName || 'Anonyme';
              membresSet.add(name);
            }
          }
          nbrInit[i] = membresSet.size;
        }
        setNbrMembres(nbrInit);
      }
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const handleNbrMembresChange = (index, value) => {
    const newNbr = [...nbrMembres];
    newNbr[index] = parseInt(value) || 0;
    setNbrMembres(newNbr);
  };

  if (loading) return <div className="text-center p-4">Chargement du cahier de dîme...</div>;

  const displayFederation = (user?.federation || '').toUpperCase();
  const displayDistrict = capitalizeFirstLetter(user?.district || '');
  const displayEglise = capitalizeFirstLetter(eglise);

  return (
    <div className="carnet-dime">
      <style>{`
        .carnet-dime { font-family: Arial, sans-serif; font-size: 11px; }
        .carnet-dime table { border-collapse: collapse; width: 100%; }
        .carnet-dime th, .carnet-dime td { border: 1px solid black; padding: 2px 4px; text-align: center; }
        .carnet-dime .header-cell { background-color: #d9e1f2; font-weight: bold; }
        .carnet-dime .yellow-bg { background-color: #ffff00; font-weight: bold; }
        .carnet-dime .gray-bg { background-color: #f0f0f0; }
        .carnet-dime .green-bg { background-color: #92d050; }
        .carnet-dime .orange-bg { background-color: #ffcc66; }
        .carnet-dime .left-align { text-align: left; }
        .carnet-dime .right-align { text-align: right; }
        .carnet-dime input { width: 60px; text-align: center; border: 1px solid #ccc; padding: 2px; }
        @media print { .no-print { display: none !important; } .carnet-dime { font-size: 9px; } .carnet-dime input { border: none; background: transparent; } }
      `}</style>
      <div className="flex justify-between items-center mb-2 no-print"><h2 className="text-xl font-bold">Cahier de Dîme {annee}</h2><button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm"><i className="fas fa-print"></i> Imprimer</button></div>
      <div className="text-center mb-2"><div className="font-bold uppercase text-xl">{displayFederation}</div></div>
      <div className="flex justify-between items-baseline mb-3"><div className="text-left font-bold uppercase">{displayDistrict}</div><div className="text-center font-bold text-xl">CAHIER DE DÎME {annee}</div><div className="text-right font-bold uppercase">{displayEglise}</div></div>
      <div className="overflow-auto">
        <table>
          <thead>
            <tr><td className="header-cell left-align" colSpan="2">%Off par Perso =</td>{MONTHS.map((_,idx)=><td key={idx} className="green-bg right-align">{offParPerso[idx] > 0 ? Math.round(offParPerso[idx]).toLocaleString() : '-'}</td>)}<td className="green-bg right-align">{totalOffParPerso > 0 ? Math.round(totalOffParPerso).toLocaleString() : '-'}</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">%Off%Dîme</td>{MONTHS.map((_,idx)=><td key={idx} className="green-bg right-align">{monthlyStats.pourcentOffDime[idx] > 0 ? Math.round(monthlyStats.pourcentOffDime[idx]) : '-'}</td>)}<td className="green-bg right-align">{totalAnnualStats.pourcentOffDime > 0 ? Math.round(totalAnnualStats.pourcentOffDime) : '-'}</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">Nbr de Membre</td>{MONTHS.map((_,idx)=><td key={idx} className="orange-bg"><input type="number" value={nbrMembres[idx]} onChange={e => handleNbrMembresChange(idx, e.target.value)} className="no-print" /></td>)}<td className="orange-bg">-</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">TOTAL VERS =</td>{MONTHS.map((_,idx)=><td key={idx} className="yellow-bg right-align">{formatNumber(monthlyStats.totalVers[idx])}</td>)}<td className="yellow-bg right-align">{formatNumber(totalAnnualStats.totalVers)}</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">Achat ou Frais =</td>{MONTHS.map((_,idx)=><td key={idx} className="right-align">{formatNumber(monthlyStats.frais[idx])}</td>)}<td className="right-align">{formatNumber(totalAnnualStats.frais)}</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">Off Combiné de l'Église =</td>{MONTHS.map((_,idx)=><td key={idx} className="right-align">{formatNumber(monthlyStats.offCombine[idx])}</td>)}<td className="right-align">{formatNumber(totalAnnualStats.offCombine)}</td></tr>
            <tr><td className="header-cell left-align" colSpan="2">TOTAL DÎME (par Mois)=</td>{MONTHS.map((_,idx)=><td key={idx} className="right-align">{formatNumber(monthlyStats.totalDime[idx])}</td>)}<td className="right-align">{formatNumber(totalAnnualStats.totalDime)}</td></tr>
            <tr className="bg-indigo-50"><th className="border p-1" style={{width:'30px'}}>N°</th><th className="border p-1 left-align" style={{width:'200px'}}>ANARANA</th>{MONTHS.map(m=><th key={m} className="border p-1" style={{width:'80px'}}>{m}</th>)}<th className="border p-1" style={{width:'100px'}}>TOTAL</th></tr>
          </thead>
          <tbody>
            {members.map((member, index)=>(
              <tr key={member.name}><td className="border p-1 text-center">{index+1}</td><td className="border p-1 left-align">{member.name === 'Anonyme' ? <span className="yellow-bg px-1">{escapeHtml(member.name)}</span> : escapeHtml(member.name)}</td>
              {member.monthly.map((val,idx)=><td key={idx} className={`border p-1 right-align ${val===0?'gray-bg':''}`}>{formatNumber(val)}</td>)}<td className="border p-1 right-align font-bold">{formatNumber(member.total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}