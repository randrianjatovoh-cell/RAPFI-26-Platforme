// src/components/RecapGL.js
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, nombreEnLettresCapitalized, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

export default function RecapGL({ currentMonth, refreshAll, user: propUser, selectedEglise }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [sabTotals, setSabTotals] = useState({});
  const [frais, setFraisState] = useState(0);
  const [totals, setTotals] = useState({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
  const [loading, setLoading] = useState(true);
  const eglise = selectedEglise || user?.eglise || '';
  const district = user?.district || '';
  const federation = user?.federation || '';

  useEffect(() => {
    if (currentMonth && eglise) loadData();
    else setLoading(false);
  }, [currentMonth, refreshAll, eglise]);

  async function loadData() {
    setLoading(true);
    try {
      const glData = await api.getGL(currentMonth) || {};
      const perSabbath = {1:{f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0},2:{},3:{},4:{},5:{}};
      for (let s=1; s<=5; s++) {
        if (!perSabbath[s]) perSabbath[s] = {f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0};
        const entries = glData[s] || [];
        for (const ent of entries) {
          perSabbath[s].f1 += ent.f1||0; perSabbath[s].f2 += ent.f2||0; perSabbath[s].f3 += ent.f3||0;
          perSabbath[s].f4 += ent.f4||0; perSabbath[s].f5 += ent.f5||0; perSabbath[s].f6 += ent.f6||0;
          perSabbath[s].f7 += ent.f7||0; perSabbath[s].f8 += ent.f8||0;
          perSabbath[s].b9 += ent.b9||0; perSabbath[s].b10 += ent.b10||0;
        }
      }
      setSabTotals(perSabbath);
      const newTotals = { f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 };
      for (let s=1;s<=5;s++) {
        const p = perSabbath[s] || {};
        newTotals.f1 += p.f1; newTotals.f2 += p.f2; newTotals.f3 += p.f3; newTotals.f4 += p.f4;
        newTotals.f5 += p.f5; newTotals.f6 += p.f6; newTotals.f7 += p.f7; newTotals.f8 += p.f8;
        newTotals.b9 += p.b9; newTotals.b10 += p.b10;
      }
      setTotals(newTotals);
      const fraisVal = await api.getFrais(currentMonth, eglise);
      setFraisState(fraisVal);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleFraisChange(value) {
    const newFrais = parseFloat(value) || 0;
    setFraisState(newFrais);
    await api.setFrais(currentMonth, eglise, newFrais);
    if (refreshAll && typeof refreshAll === 'function') refreshAll();
  }

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher le récapitulatif.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const totalA = totals.f1+totals.f2+totals.f3+totals.f4+totals.f5+totals.f6+totals.f7+totals.f8;
  const totalB = totals.b9+totals.b10;
  const totalAB = totalA+totalB;
  const safeTotalAB = isNaN(totalAB)?0:totalAB;
  const totalEnLettres = nombreEnLettresCapitalized(safeTotalAB);
  const netFederation = totalA - frais;
  const displayEglise = capitalizeFirstLetter(eglise);
  const displayDistrict = capitalizeFirstLetter(district);
  const displayFederation = (federation || '').toUpperCase();

  return (
    <div><div className="flex justify-between items-center mb-2 no-print"><h2 className="text-xl font-bold">RÉCAPITULATIF GRAND LIVRE</h2><div className="flex gap-2"><button onClick={()=>window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm"><i className="fas fa-print"></i> Imprimer</button><button onClick={loadData} className="bg-blue-600 text-white px-3 py-1 rounded text-sm"><i className="fas fa-sync-alt"></i> Rafraîchir</button></div></div>
      <style>{`@media print{@page{size:A4 landscape;margin:0.4cm}body,.recap-print{font-size:9pt!important}.no-print{display:none!important}table{font-size:8pt!important}th,td{padding:1px 2px!important}.border,.border-black{border-color:#000!important;border-width:0.5pt!important}}`}</style>
      <div className="recap-print"><div className="mb-2" style={{lineHeight:'1.2'}}><div className="flex justify-between items-baseline"><div className="text-left font-semibold">Fiangonana: {escapeHtml(displayEglise)}</div><div className="text-center font-bold uppercase">{displayFederation}</div><div className="text-right">Takelaka: RÉCAP</div></div><div className="flex justify-between items-baseline mt-1"><div className="text-left">Distrika: {escapeHtml(displayDistrict)}</div><div className="text-center font-bold">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA"</div><div className="text-right">Volana sy Taona: {formatMonthYear(currentMonth)}</div></div><div className="text-center text-sm mt-1">Ohabolana 28:20a</div></div>
        <div className="overflow-x-auto"><table className="w-full text-sm border border-black"><thead className="bg-gray-100"><tr className="text-center"><th rowSpan="2" className="border p-1">N°</th><th rowSpan="2" className="border p-1">Anarana na SABATA</th><th rowSpan="2" className="border p-1">Rosia n°</th><th rowSpan="2" className="border p-1">Tontalin'ny A+B</th><th colSpan="9" className="border p-1 bg-blue-100">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th><th colSpan="3" className="border p-1 bg-green-100">MIJANONA HO AN'NY FIANGONANA (B)</th></tr><tr className="text-xs text-center"><th className="border p-1">Tontalin'ny A</th><th className="border p-1">(1)</th><th className="border p-1">(2)</th><th className="border p-1">(3)</th><th className="border p-1">(4)</th><th className="border p-1">(5)</th><th className="border p-1">(6)</th><th className="border p-1">(7)</th><th className="border p-1">(8)</th><th className="border p-1">Tontalin'ny B</th><th className="border p-1">(9)</th><th className="border p-1">(10)</th></tr></thead><tbody>{[1,2,3,4,5].map(s=>{ const p = sabTotals[s]||{f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0}; const sumA = p.f1+p.f2+p.f3+p.f4+p.f5+p.f6+p.f7+p.f8; const sumB = p.b9+p.b10; return (<tr key={s}><td className="border p-1 text-center">{s}</td><td className="border p-1 font-bold">Sabata Faha-{s}</td><td className="border p-1">-</td><td className="border p-1 text-right">{formatNumber(sumA+sumB)}</td><td className="border p-1 text-right">{formatNumber(sumA)}</td><td className="border p-1 text-right">{formatNumber(p.f1)}</td><td className="border p-1 text-right">{formatNumber(p.f2)}</td><td className="border p-1 text-right">{formatNumber(p.f3)}</td><td className="border p-1 text-right">{formatNumber(p.f4)}</td><td className="border p-1 text-right">{formatNumber(p.f5)}</td><td className="border p-1 text-right">{formatNumber(p.f6)}</td><td className="border p-1 text-right">{formatNumber(p.f7)}</td><td className="border p-1 text-right">{formatNumber(p.f8)}</td><td className="border p-1 text-right">{formatNumber(sumB)}</td><td className="border p-1 text-right">{formatNumber(p.b9)}</td><td className="border p-1 text-right">{formatNumber(p.b10)}</td></tr>);})}</tbody><tfoot className="bg-gray-50 font-semibold"><tr><td colSpan="3" className="border text-right">TOTAL GÉNÉRAL</td><td className="border text-right">{formatNumber(safeTotalAB)}</td><td className="border text-right">{formatNumber(totalA)}</td><td className="border text-right">{formatNumber(totals.f1)}</td><td className="border text-right">{formatNumber(totals.f2)}</td><td className="border text-right">{formatNumber(totals.f3)}</td><td className="border text-right">{formatNumber(totals.f4)}</td><td className="border text-right">{formatNumber(totals.f5)}</td><td className="border text-right">{formatNumber(totals.f6)}</td><td className="border text-right">{formatNumber(totals.f7)}</td><td className="border text-right">{formatNumber(totals.f8)}</td><td className="border text-right">{formatNumber(totalB)}</td><td className="border text-right">{formatNumber(totals.b9)}</td><td className="border text-right">{formatNumber(totals.b10)}</td></tr></tfoot></table></div>
        <div className="mt-2 text-sm"><div><strong>Tontalin'ny vola rehetra niditra sy voaisa (A+B) (Atao an-tsoratra) Ar :</strong> {totalEnLettres} Ariary.-</div><div className="mt-1"><strong>Saram-pandefasana :</strong> <input type="number" value={frais} onChange={e=>handleFraisChange(e.target.value)} className="px-2 py-1 w-20 text-right" step="any"/> Ar</div><div className="mt-1"><strong>Tontalin'ny vola harotsaka amin'ny Federation :</strong> {formatNumber(netFederation)} Ar</div></div>
        <div className="grid grid-cols-3 gap-4 mt-3 text-sm"><div className="text-left">Ny Mpitahiry vola: _______________<br/>Adiresy: _______________<br/>Tel n°: _______________<br/>sonia: _______________</div><div className="text-center">Hita sy voamarina tamin'ny: _______________<br/>Ny Loholona (na Ny Tale): _______________<br/>Sonia: _______________</div><div className="text-right">Ny Mpitahiry vola: _______________<br/>Adiresy: _______________<br/>Tel n°: _______________<br/>sonia: _______________</div></div>
      </div>
    </div>
  );
}