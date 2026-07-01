// src/components/RecapFederation.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatNumber } from '../services/helpers';

const MONTHS = [
  { id: '01', label: 'Janv' },
  { id: '02', label: 'Fév' },
  { id: '03', label: 'Mars' },
  { id: '04', label: 'Avr' },
  { id: '05', label: 'Mai' },
  { id: '06', label: 'Juin' },
  { id: '07', label: 'Juil' },
  { id: '08', label: 'Août' },
  { id: '09', label: 'Sept' },
  { id: '10', label: 'Oct' },
  { id: '11', label: 'Nov' },
  { id: '12', label: 'Déc' }
];

const monthTextColors = [
  'text-blue-600', 'text-indigo-600', 'text-purple-600', 'text-pink-600',
  'text-red-600', 'text-orange-600', 'text-yellow-600', 'text-green-600',
  'text-teal-600', 'text-cyan-600', 'text-sky-600', 'text-violet-600'
];

export default function RecapFederation({ readOnly = false, onSelectDistrict }) {
  const { user } = useUser();
  const federation = user?.federation || '';

  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [districtsData, setDistrictsData] = useState([]);

  const availableYears = [];
  for (let y = 2026; y <= new Date().getFullYear() + 2; y++) {
    availableYears.push(y);
  }

  useEffect(() => {
    if (!federation) {
      setDistrictsData([]);
      return;
    }
    loadData();
  }, [federation, selectedYear]);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer toutes les églises de la fédération
      const eglisesList = await api.getEglisesByFederation(federation);

      if (eglisesList.length === 0) {
        setDistrictsData([]);
        setLoading(false);
        return;
      }

      // 2. Récupérer tous les utilisateurs pour mapper église → district
      const allUsers = await api.getAllUsers();
      const egliseToDistrict = {};
      allUsers.forEach(u => {
        if (u.eglise) {
          egliseToDistrict[u.eglise] = u.district || 'District non défini';
        }
      });

      const yearStr = selectedYear.toString();

      // 3. Pour chaque église, récupérer les données mensuelles
      const churchDataPromises = eglisesList.map(async (egliseNom) => {
        const monthlyDime = new Array(12).fill(0);
        const monthlyTotal = new Array(12).fill(0);

        for (let idx = 0; idx < MONTHS.length; idx++) {
          const monthId = `${yearStr}-${MONTHS[idx].id}`;
          try {
            const glData = await api.getGL(monthId, null, null, egliseNom);
            let monthDime = 0, monthTotalA = 0;
            if (glData) {
              for (let s = 1; s <= 5; s++) {
                const entries = glData[s] || [];
                for (const entry of entries) {
                  const f1 = entry.f1 || 0;
                  const f2 = entry.f2 || 0;
                  const f3 = entry.f3 || 0;
                  const f4 = entry.f4 || 0;
                  const f5 = entry.f5 || 0;
                  const f6 = entry.f6 || 0;
                  const f7 = entry.f7 || 0;
                  const f8 = entry.f8 || 0;
                  monthDime += f1;
                  monthTotalA += f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
                }
              }
            }
            monthlyDime[idx] = monthDime;
            monthlyTotal[idx] = monthTotalA;
          } catch (err) {
            console.warn(`Erreur pour ${egliseNom} mois ${monthId}:`, err);
          }
        }

        const district = egliseToDistrict[egliseNom] || 'District non défini';
        return { eglise: egliseNom, district, monthlyDime, monthlyTotal };
      });

      const churchData = await Promise.all(churchDataPromises);

      // 4. Grouper par district
      const districtMap = new Map();
      churchData.forEach(({ district, monthlyDime, monthlyTotal }) => {
        if (!districtMap.has(district)) {
          districtMap.set(district, {
            monthlyDime: new Array(12).fill(0),
            monthlyTotal: new Array(12).fill(0)
          });
        }
        const d = districtMap.get(district);
        for (let i = 0; i < 12; i++) {
          d.monthlyDime[i] += monthlyDime[i];
          d.monthlyTotal[i] += monthlyTotal[i];
        }
      });

      const districtResults = Array.from(districtMap.entries()).map(([district, data]) => ({
        district,
        monthlyDime: data.monthlyDime,
        monthlyTotal: data.monthlyTotal
      }));

      setDistrictsData(districtResults);

    } catch (err) {
      console.error('Erreur chargement RecapFederation:', err);
      setError(err.message || 'Erreur de chargement des données');
      setDistrictsData([]);
    } finally {
      setLoading(false);
    }
  }

  // Calcul des totaux annuels par district
  const districtTotals = districtsData.map(d => ({
    district: d.district,
    totalDime: d.monthlyDime.reduce((a, b) => a + b, 0),
    totalVersement: d.monthlyTotal.reduce((a, b) => a + b, 0)
  }));

  // Totaux généraux de la fédération
  const federationTotals = districtTotals.reduce((acc, c) => ({
    totalDime: acc.totalDime + c.totalDime,
    totalVersement: acc.totalVersement + c.totalVersement
  }), { totalDime: 0, totalVersement: 0 });

  // Totaux mensuels de la fédération
  const monthlyFederationTotals = {
    dime: new Array(12).fill(0),
    versement: new Array(12).fill(0)
  };
  districtsData.forEach(d => {
    for (let i = 0; i < 12; i++) {
      monthlyFederationTotals.dime[i] += d.monthlyDime[i];
      monthlyFederationTotals.versement[i] += d.monthlyTotal[i];
    }
  });

  if (!federation) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Aucune fédération associée à votre compte.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-4">Chargement des données de la fédération...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <i className="fas fa-exclamation-triangle mr-2"></i> Erreur : {error}
        <button onClick={loadData} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
          <i className="fas fa-sync-alt mr-1"></i> Réessayer
        </button>
      </div>
    );
  }

  const hasData = districtsData.some(d => d.monthlyTotal.some(v => v > 0));

  const handleDistrictClick = (districtName) => {
    if (onSelectDistrict && typeof onSelectDistrict === 'function') {
      onSelectDistrict(districtName);
    }
  };

  return (
    <div className="p-4">
      {/* FILTRES - masqués à l'impression */}
      <div className="flex flex-wrap gap-4 mb-6 items-end no-print">
        <div>
          <label className="block text-sm font-medium text-gray-700">Fédération</label>
          <input
            type="text"
            value={federation}
            disabled
            className="mt-1 border rounded px-3 py-2 w-48 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Année</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="mt-1 border rounded px-3 py-2 w-32 bg-white"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={loadData}
          className="mt-6 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
        >
          <i className="fas fa-sync-alt mr-1"></i> Rafraîchir
        </button>
      </div>

      <div className="overflow-x-auto">
        {/* EN-TÊTE AVEC LOGOS */}
        <div className="flex items-center justify-between mb-2" style={{ borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px' }}>
              <img src="/FINANCE.png" alt="Finance" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <div className="separator-line" style={{ width: '1px', height: '40px', backgroundColor: '#000' }} />
            <div style={{ width: '40px', height: '40px' }}>
              <img src="/Noir.png" alt="Noir" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>
          <div className="text-center flex-1">
            <div className="font-bold text-base uppercase">{federation}</div>
            <div className="font-bold text-lg">RAPPORT FINANCIER PAR DISTRICT - {selectedYear}</div>
            <div className="text-xs italic">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA" (Ohab. 28:20a)</div>
          </div>
          <div className="no-print">
            <button onClick={() => window.print()} className="bg-gray-600 text-white px-2 py-0.5 rounded text-sm">🖨️ Imprimer</button>
          </div>
        </div>

        <table className="w-full text-sm border-collapse border border-gray-300" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '5%' }} />
            {MONTHS.map(() => <col key={Math.random()} style={{ width: '5.8%' }} />)}
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th rowSpan="2" className="border p-1 text-center text-xs">N°</th>
              <th rowSpan="2" className="border p-1 text-left text-xs">DISTRICT</th>
              <th rowSpan="2" className="border p-1 text-center text-xs">Détail</th>
              <th colSpan={MONTHS.length} className="border p-1 text-center text-xs">MOIS</th>
              <th rowSpan="2" className="border p-1 text-center text-xs">TOTAL</th>
            </tr>
            <tr className="bg-gray-100">
              {MONTHS.map((m) => (
                <th key={m.id} className="border p-1 text-center text-xs" style={{ padding: '2px 0' }}>{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {districtsData.map((district, index) => {
              const totalDime = district.monthlyDime.reduce((a, b) => a + b, 0);
              const totalVersement = district.monthlyTotal.reduce((a, b) => a + b, 0);
              
              return (
                <React.Fragment key={district.district}>
                  <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-1 text-center text-xs" rowSpan="2">{index + 1}</td>
                    <td className="border p-1 text-xs font-medium" rowSpan="2" style={{ whiteSpace: 'nowrap', wordBreak: 'keep-all' }}>
                      {onSelectDistrict ? (
                        <button
                          onClick={() => handleDistrictClick(district.district)}
                          className="text-blue-600 underline hover:text-blue-800 focus:outline-none text-xs"
                        >
                          {district.district}
                        </button>
                      ) : (
                        district.district
                      )}
                    </td>
                    <td className="border p-1 text-center italic text-xs">1/10<sup>e</sup></td>
                    {district.monthlyDime.map((val, idx) => (
                      <td key={idx} className="border p-1 text-right text-xs">{formatNumber(val) || '-'}</td>
                    ))}
                    <td className="border p-1 text-right font-bold text-xs bg-yellow-50">
                      {formatNumber(totalDime) || '-'}
                    </td>
                  </tr>
                  <tr className={index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'}>
                    <td className="border p-1 text-center italic text-xs">Versée</td>
                    {district.monthlyTotal.map((val, idx) => (
                      <td key={idx} className="border p-1 text-right text-xs">{formatNumber(val) || '-'}</td>
                    ))}
                    <td className="border p-1 text-right font-bold text-xs bg-yellow-50">
                      {formatNumber(totalVersement) || '-'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan="2" className="border p-1 text-right text-xs">DÎMES</td>
              <td className="border p-1 text-center text-xs">-</td>
              {monthlyFederationTotals.dime.map((val, idx) => (
                <td key={idx} className={`border p-1 text-right text-xs ${monthTextColors[idx]}`}>
                  {formatNumber(val) || '-'}
                </td>
              ))}
              <td className="border p-1 text-right text-xs text-red-700">
                {formatNumber(federationTotals.totalDime) || '-'}
              </td>
            </tr>
            <tr className="bg-gray-300 font-bold">
              <td colSpan="2" className="border p-1 text-right text-xs">Total FÉDÉRATION</td>
              <td className="border p-1 text-center text-xs">-</td>
              {monthlyFederationTotals.versement.map((val, idx) => (
                <td key={idx} className={`border p-1 text-right text-xs ${monthTextColors[idx]}`}>
                  {formatNumber(val) || '-'}
                </td>
              ))}
              <td className="border p-1 text-right text-xs text-red-700">
                {formatNumber(federationTotals.totalVersement) || '-'}
              </td>
            </tr>
          </tfoot>
        </table>

        {!hasData && (
          <div className="text-center p-4 text-gray-500 mt-4">
            Aucune donnée enregistrée pour cette fédération en {selectedYear}.
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0.15cm; }
          .no-print { display: none !important; }
          body, .p-4 { padding: 0 !important; margin: 0 !important; }
          table { width: 100% !important; font-size: 8pt !important; }
          th, td { padding: 1px 2px !important; border-color: #000 !important; font-size: 8pt !important; }
          th { font-size: 7.5pt !important; }
          .separator-line { background-color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bg-gray-100, .bg-gray-200, .bg-gray-300, .bg-blue-50, .bg-blue-100, .bg-white, .bg-gray-50,
          .bg-yellow-50, .bg-red-200 {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-blue-600 { color: #2563eb !important; }
          .text-indigo-600 { color: #4f46e5 !important; }
          .text-purple-600 { color: #7c3aed !important; }
          .text-pink-600 { color: #db2777 !important; }
          .text-red-600 { color: #dc2626 !important; }
          .text-orange-600 { color: #ea580c !important; }
          .text-yellow-600 { color: #ca8a04 !important; }
          .text-green-600 { color: #16a34a !important; }
          .text-teal-600 { color: #0d9488 !important; }
          .text-cyan-600 { color: #0891b2 !important; }
          .text-sky-600 { color: #0284c7 !important; }
          .text-violet-600 { color: #7c3aed !important; }
          .text-red-700 { color: #b91c1c !important; }
          .text-xs { font-size: 8pt !important; }
        }
      `}</style>
    </div>
  );
}