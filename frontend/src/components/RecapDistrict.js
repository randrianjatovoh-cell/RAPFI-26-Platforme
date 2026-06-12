// src/components/RecapDistrict.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatNumber, capitalizeFirstLetter } from '../services/helpers';

export default function RecapDistrict({ user: propUser, mode = 'normal', readOnly = false }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [eglises, setEglises] = useState([]);
  const [year, setYear] = useState(2026);
  const [reportsData, setReportsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ dimeTotal:0, netTotal:0 });

  useEffect(() => {
    if (user) {
      if (user.fonction === 'Admin') loadAllDistricts();
      else if (user.district) setSelectedDistrict(user.district);
      else if (user.fonction === 'Vérificateur') loadDistrictsForVerificateur();
    }
  }, [user]);

  async function loadAllDistricts() {
    const allUsers = await api.getAllUsers();
    const districtsList = [...new Set(allUsers.filter(u=>u.district).map(u=>u.district))];
    setDistricts(districtsList);
    if (districtsList.length && !selectedDistrict) setSelectedDistrict(districtsList[0]);
  }
  async function loadDistrictsForVerificateur() {
    const allUsers = await api.getAllUsers();
    const districtsList = [...new Set(allUsers.filter(u=>u.federation===user.federation && u.district).map(u=>u.district))];
    setDistricts(districtsList);
    if (districtsList.length && !selectedDistrict) setSelectedDistrict(districtsList[0]);
  }

  useEffect(() => {
    if (selectedDistrict && year) loadDistrictData();
  }, [selectedDistrict, year]);

  async function loadDistrictData() {
    setLoading(true);
    try {
      const eglisesList = await api.getAllEglisesByDistrict(selectedDistrict);
      const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const data = {};
      let totalDime = 0, totalNet = 0;
      const egliseNetTotals = [];
      for (const eglise of eglisesList) {
        const egliseData = {};
        let egliseDimeTotal = 0, egliseNetTotal = 0;
        for (const month of months) {
          const monthId = `${year}-${month}`;
          const glData = await api.getGL(monthId) || {};
          let totalA = 0, ampahafolony = 0;
          for (let s=1; s<=5; s++) {
            const entries = glData[s] || [];
            for (const ent of entries) {
              ampahafolony += ent.f1 || 0;
              totalA += (ent.f1||0)+(ent.f2||0)+(ent.f3||0)+(ent.f4||0)+(ent.f5||0)+(ent.f6||0)+(ent.f7||0)+(ent.f8||0);
            }
          }
          const frais = await api.getFrais(monthId, eglise);
          const net = Math.max(0, totalA - frais);
          egliseData[month] = { dime: ampahafolony, net };
          egliseDimeTotal += ampahafolony;
          egliseNetTotal += net;
          totalDime += ampahafolony;
          totalNet += net;
        }
        data[eglise] = egliseData;
        egliseNetTotals.push({ eglise, netTotal: egliseNetTotal });
      }
      egliseNetTotals.sort((a,b)=>b.netTotal - a.netTotal);
      setEglises(egliseNetTotals.map(item=>item.eglise));
      setReportsData(data);
      setTotals({ dimeTotal: totalDime, netTotal: totalNet });
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const monthsList = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const years = [2024,2025,2026,2027];
  const formatMontant = (val) => val!==0 ? val.toLocaleString()+' Ar' : '';
  const getMonthlyValues = (eglise, type) => monthsList.map((_,i)=>{
    const monthNum = String(i+1).padStart(2,'0');
    return type==='dime' ? (reportsData[eglise]?.[monthNum]?.dime||0) : (reportsData[eglise]?.[monthNum]?.net||0);
  });

  if (loading) return <div className="text-center p-4">Chargement du récapitulatif du district...</div>;
  const federationName = (user?.federation || '').toUpperCase();
  const offTotal = totals.netTotal - totals.dimeTotal;
  const displayDistrict = (selectedDistrict||'').toUpperCase();

  const RecapAnnuel = () => (
    <div className="border rounded-lg p-3 bg-gray-50 min-w-[200px]"><h3 className="font-bold text-md mb-2">Récapitulatif annuel</h3><table className="w-full text-sm"><tbody><tr className="border-b"><td className="py-1 font-medium">Dîmes totales (Ampahafolony)</td><td className="py-1 text-right">{formatMontant(totals.dimeTotal)}</td></tr><tr className="border-b"><td className="py-1 font-medium">Off</td><td className="py-1 text-right">{formatMontant(offTotal)}</td></tr><tr className="border-b"><td className="py-1 font-medium">Total fédération (net)</td><td className="py-1 text-right font-bold">{formatMontant(totals.netTotal)}</td></tr></tbody></table></div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto shadow border rounded-lg"><table className="w-full border-collapse border text-sm"><thead className="bg-gray-100"><tr><th className="border p-2">N°</th><th className="border p-2">FIANGONANA</th><th className="border p-2"></th>{monthsList.map(m=><th key={m} className="border p-2">{m}</th>)}<th className="border p-2">TOTAL</th></tr></thead><tbody>{eglises.map((eglise,idx)=>{
      const dimeValues = getMonthlyValues(eglise,'dime');
      const netValues = getMonthlyValues(eglise,'net');
      const totalDimeAnnuel = dimeValues.reduce((a,b)=>a+b,0);
      const totalNetAnnuel = netValues.reduce((a,b)=>a+b,0);
      return <React.Fragment key={eglise}><tr className="hover:bg-gray-50"><td className="border p-2 text-center" rowSpan="2">{idx+1}</td><td className="border p-2 font-medium" rowSpan="2">{eglise}</td><td className="border p-2 bg-gray-50 font-medium">Dîmes</td>{dimeValues.map((v,i)=><td key={i} className="border p-2 text-right">{formatMontant(v)}</td>)}<td className="border p-2 text-right font-bold">{formatMontant(totalDimeAnnuel)}</td></tr><tr className="hover:bg-gray-50"><td className="border p-2 bg-gray-50 font-medium">Total (net)</td>{netValues.map((v,i)=><td key={i} className="border p-2 text-right">{formatMontant(v)}</td>)}<td className="border p-2 text-right font-bold">{formatMontant(totalNetAnnuel)}</td></tr></React.Fragment>;
    })}</tbody></table></div>
  );

  return (
    <div><div className="relative mb-4"><div className="absolute top-0 right-0 no-print"><button onClick={()=>window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm"><i className="fas fa-print mr-1"></i> Imprimer</button></div><div className="flex justify-between items-start pt-8"><div className="text-left"><h2 className="text-xl font-bold whitespace-nowrap">RAPPORT FINANCIER {displayDistrict} {year}</h2></div><div className="flex items-start gap-6"><div className="text-left font-bold uppercase text-lg">{federationName||'FÉDÉRATION'}</div><RecapAnnuel /></div></div></div>{mode==='consultation'? renderTable() : <><div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded no-print"><div><label className="block text-sm font-medium">District</label><select value={selectedDistrict} onChange={e=>setSelectedDistrict(e.target.value)} className="border p-2 rounded" disabled={readOnly || (user.fonction !== 'Admin' && user.fonction !== 'Vérificateur')}>{districts.map(d=><option key={d} value={d}>{d}</option>)}</select></div><div><label className="block text-sm font-medium">Année</label><select value={year} onChange={e=>setYear(parseInt(e.target.value))} className="border p-2 rounded" disabled={readOnly}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></div></div>{renderTable()}</>}</div>
  );
}