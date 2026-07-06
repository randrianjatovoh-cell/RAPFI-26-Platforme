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
  const [references, setReferences] = useState(Array(6).fill({ date: '', soraBola: '', rosia: '' }));
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Helper : parser une date depuis "jj/mm/aaaa" ou "jj/mm"
  function parseDateString(dateStr) {
    if (!dateStr) return null;
    let parts = dateStr.split('/');
    if (parts.length === 2) {
      const year = new Date().getFullYear();
      dateStr = dateStr + '/' + year;
      parts = dateStr.split('/');
    }
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  }

  function formatLongDateFromDate(date) {
    if (!date || isNaN(date)) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formatted = date.toLocaleDateString('fr-FR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Chargement des données
  async function loadData() {
    if (!currentMonth || !eglise) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log('🔄 [RapportComite] Chargement des données pour', currentMonth, eglise);

      // 1. Récupérer le rapport mensuel
      let r = await api.getMonthlyReport(currentMonth, eglise);
      console.log('📦 [RapportComite] Rapport reçu:', r);
      if (!r) {
        console.log('🔄 [RapportComite] Rapport manquant, tentative de rebuild...');
        r = await api.rebuildMonthlyReport(currentMonth, eglise);
        console.log('📦 [RapportComite] Après rebuild:', r);
      }
      setReport(r);

      // 2. Extraire les références depuis soraBolaLinesJson
      let newRefs = Array(6).fill({ date: '', soraBola: '', rosia: '' });
      let rawJson = null;

      // Priorité 1 : champ soraBolaLinesJson du rapport
      if (r && r.soraBolaLinesJson) {
        rawJson = r.soraBolaLinesJson;
        console.log('📋 [RapportComite] soraBolaLinesJson trouvé dans le rapport');
      } else {
        // Priorité 2 : fallback localStorage
        const fallbackKey = `chequeSora_${currentMonth}_${eglise}`;
        const stored = localStorage.getItem(fallbackKey);
        if (stored) {
          rawJson = stored;
          console.log('📋 [RapportComite] soraBolaLinesJson restauré depuis localStorage');
        }
      }

      if (rawJson) {
        try {
          const parsed = JSON.parse(rawJson);
          console.log('📋 [RapportComite] parsed:', parsed);
          let chequeArr = [];
          let soraArr = [];
          if (parsed && typeof parsed === 'object' && parsed.cheque && parsed.soraBola) {
            chequeArr = parsed.cheque || [];
            soraArr = parsed.soraBola || [];
          } else if (Array.isArray(parsed)) {
            soraArr = parsed;
          }
          console.log('📋 [RapportComite] chequeArr:', chequeArr);
          console.log('📋 [RapportComite] soraArr:', soraArr);
          const maxLines = Math.min(chequeArr.length, soraArr.length, 5);
          for (let i = 0; i < maxLines; i++) {
            const chequeStr = chequeArr[i] || '';
            const soraAmount = soraArr[i] || '';
            let dateFormatted = '';
            let ref = '';
            if (chequeStr) {
              const duIndex = chequeStr.indexOf(' du ');
              if (duIndex !== -1) {
                ref = chequeStr.substring(0, duIndex).trim();
                let datePart = chequeStr.substring(duIndex + 4).trim();
                const dateObj = parseDateString(datePart);
                if (dateObj) {
                  dateFormatted = formatLongDateFromDate(dateObj);
                } else {
                  dateFormatted = datePart;
                }
              } else {
                ref = chequeStr;
              }
            }
            newRefs[i] = { date: dateFormatted, soraBola: soraAmount, rosia: ref };
          }
          console.log('✅ [RapportComite] Références extraites:', newRefs);
        } catch(e) {
          console.warn("❌ [RapportComite] Erreur parsing:", e);
        }
      } else {
        console.warn('⚠️ [RapportComite] Aucune donnée trouvée.');
      }
      setReferences(newRefs);

      // 3. Charger les données GL et dépenses
      const glData = await api.getGL(currentMonth, null, null, eglise) || {};
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

      const expensesList = await api.getDepenses(currentMonth, null, null, eglise);
      const total = expensesList.reduce((s,e) => s + (Number(e.amount)||0), 0);
      setTotalExpenses(total);

      const fraisVal = await api.getFrais(currentMonth, eglise);
      setFrais(fraisVal);

      const savedOpening = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
      const opening = savedOpening ? parseFloat(savedOpening) : 0;
      setOpeningChurch(opening);
      setClosingBalanceChurch(opening + b9 - total);
      setClosingBalanceSpecial(0 + b10);
    } catch(err) {
      console.error("❌ Erreur dans RapportComite:", err);
    }
    finally { setLoading(false); }
  }

  // Rechargement automatique
  useEffect(() => {
    loadData();
  }, [currentMonth, eglise, refreshTrigger]);

  // Écoute des événements de mise à jour des données
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('📢 [RapportComite] Événement data-updated reçu, rechargement...');
      loadData();
    };
    window.addEventListener('data-updated', handleDataUpdate);
    window.addEventListener('expenses-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('data-updated', handleDataUpdate);
      window.removeEventListener('expenses-updated', handleDataUpdate);
    };
  }, [currentMonth, eglise]);

  // Mise à jour des champs utilisateur
  useEffect(() => {
    setEglise(selectedEglise || user?.eglise || '');
    setDistrict(user?.district || '');
    setFederation(user?.federation || '');
  }, [selectedEglise, user]);

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement du rapport...</div>;

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
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body, .print-container { margin: 0 !important; padding: 0 !important; }
          .print-container { padding: 2px !important; }
          .no-print { display: none !important; }
          table, th, td { page-break-inside: avoid !important; }
          .border, .border-black { border-color: #000 !important; border-width: 0.4pt !important; }
          th, td { padding: 1px 2px !important; font-size: 7pt !important; }
          input { border: none !important; background: transparent !important; }
          body, .print-container, div, p, span, strong, td, th { font-size: 8pt !important; }
          .mb-4, .mt-2, .mt-6 { margin-bottom: 2px !important; margin-top: 2px !important; }
          .text-sm { font-size: 8pt !important; }
          .text-xs { font-size: 7pt !important; }
          .text-lg { font-size: 10pt !important; }
          .text-xl { font-size: 12pt !important; }
          .text-center { text-align: center !important; }
        }
        .separator-line { width: 1px; height: 50px; background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      {/* EN-TÊTE AVEC LOGOS */}
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
          <div className="font-bold text-lg">FIANGONANA ADVANTISTA MITANDRINA NY ANDRO FAHAFITO</div>
          {displayFederation && <div className="font-bold text-md uppercase">{displayFederation}</div>}
          <div className="font-bold uppercase text-md">SAMPANA FANAMARINANA KAONTY</div>
          <div className="font-bold text-xl underline mt-1">TATITRA ARA-BOLA HO AN'NY KOMITY SY NY FIANGONANA</div>
        </div>
        <div className="no-print">
          <button onClick={() => window.print()} className="bg-gray-600 text-white px-2 py-0.5 rounded text-sm">🖨️ Imprimer</button>
        </div>
      </div>

      <div className="mb-4 text-sm" style={{lineHeight:'1.2'}}>
        <div className="grid grid-cols-3">
          <div><strong>FIANGONANA:</strong> {escapeHtml(displayEglise)}</div>
          <div className="text-center"><strong>VOLANA:</strong> {mois}</div>
          <div className="text-right"><strong>DATY NANAOVANA NY FIVORIANA:</strong> ____/____/____</div>
        </div>
        <div className="grid grid-cols-3" style={{marginTop:0}}>
          <div><strong>DISTRIKA:</strong> {escapeHtml(displayDistrict)}</div>
          <div className="text-center"><strong>TAONA:</strong> {annee}</div>
          <div className="text-right"><strong>ISAN'NY TONGA:</strong> _______</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th colSpan="3" className="border p-1 bg-blue-100">VOLA NAROTSAKA TANY AMIN'NY FEDERASIONA</th>
              <th className="separator-col p-1 bg-white" style={{width:'20px',border:'none'}}></th>
              <th colSpan="4" className="border p-1 bg-green-100">TOE-BOLAN'NY FIANGONANA EO AN-TOERANA</th>
            </tr>
            <tr className="text-center">
              <th className="border p-1">ANTONY</th>
              <th className="border p-1">TONTALINY</th>
              <th className="border p-1">RAPAORO</th>
              <th className="separator-col p-1" style={{border:'none'}}></th>
              <th className="border p-1">ANTONY</th>
              <th className="border p-1">FIANGONANA</th>
              <th className="border p-1">MANOKANA</th>
              <th className="border p-1">TONTALINY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1">Ampahafolony</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[0])}</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[0])}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
              <td className="border p-1">VOLA SISA tamin'ny volana teo aloha</td>
              <td className="border p-1 text-right">{formatNumber(openingChurch)}</td>
              <td className="border p-1 text-right bg-gray-100"></td>
              <td className="border p-1 text-right">{formatNumber(openingChurch)}</td>
            </tr>
            <tr>
              <td className="border p-1">Sekoly Sabata/S. faha-13</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[1])}</td>
              <td rowSpan="4" className="border p-1 text-right align-middle">{formatNumber(sumForRapaoro)}</td>
              <td rowSpan="4" className="separator-col p-1" style={{border:'none'}}></td>
              <td className="border p-1">VOLA NIDITRA nandritra ny volana</td>
              <td className="border p-1 text-right">{formatNumber(b9Total)}</td>
              <td className="border p-1 text-right">{formatNumber(b10Total)}</td>
              <td className="border p-1 text-right">{formatNumber(b9Total+b10Total)}</td>
            </tr>
            <tr>
              <td className="border p-1">Fanambinana</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[2])}</td>
              <td className="border p-1">VOLA NIVOAKA nandritra ny volana</td>
              <td className="border p-1 text-right">{formatNumber(totalExpenses)}</td>
              <td className="border p-1 text-right"> </td>
              <td className="border p-1 text-right">{formatNumber(totalExpenses)}</td>
            </tr>
            <tr>
              <td className="border p-1">Tsingerin-taona</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[3])}</td>
              <td className="border p-1">VOLA SISA tamin'ny faran'ny volana</td>
              <td className="border p-1 text-right">{formatNumber(closingBalanceChurch)}</td>
              <td className="border p-1 text-right">{formatNumber(closingBalanceSpecial)}</td>
              <td className="border p-1 text-right">{formatNumber(closingBalanceChurch+closingBalanceSpecial)}</td>
            </tr>
            <tr>
              <td className="border p-1">Fanompoam-pivavahana</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[4])}</td>
              <td colSpan="4" className="border p-1 text-center">Sonian'ireo mambra ao amin'ny Komity :</td>
            </tr>
            <tr>
              <td className="border p-1">Federasiona</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[5])}</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[5])}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
              <td rowSpan="3" colSpan="4" className="border p-1 signatures-cell" style={{verticalAlign:'top'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div><strong>Ny Mpitahiry vola :</strong></div>
                  <div style={{textAlign:'center'}}><strong>Ny Mpitahiry vola mpanampy :</strong></div>
                  <div style={{textAlign:'right'}}><strong>Ireo Loholona na Tale :</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="border p-1">Maneran-tany</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[6])}</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[6])}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
            </tr>
            <tr>
              <td className="border p-1">Manokana</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[7])}</td>
              <td className="border p-1 text-right">{formatNumber(rowValues[7])}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
            </tr>
            <tr className="font-bold">
              <td className="border p-1">TONTALIN'NY VOLA MIAKATRA any @ FME</td>
              <td className="border p-1 text-right">{formatNumber(totalA)}</td>
              <td className="border p-1 text-right">{formatNumber(totalA)}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
              <td rowSpan="4" colSpan="4" className="border p-1 relative" style={{minHeight:'60px'}}>
                <div className="absolute top-0 left-0"><strong>Ireo mambran'ny Komity (Sonia sy anarana) :</strong></div>
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2"><strong>Ny Pasitora :</strong></div>
              </td>
            </tr>
            <tr className="font-bold">
              <td className="border p-1">Volam-piangonana apetraka any @ FME</td>
              <td className="border p-1 text-right">{formatNumber(totalA - frais)}</td>
              <td className="border p-1 text-right">{formatNumber(totalA - frais)}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
            </tr>
            <tr className="font-bold">
              <td className="border p-1">Saram-pandefasana</td>
              <td className="border p-1 text-right">{formatNumber(frais)}</td>
              <td className="border p-1 text-right">{formatNumber(frais)}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
            </tr>
            <tr className="font-bold bg-gray-50">
              <td className="border p-1">TONTALIN'NY VOLA HAROTSAKA ANY @ FME</td>
              <td className="border p-1 text-right">{formatNumber(totalA - frais)}</td>
              <td className="border p-1 text-right">{formatNumber(totalA - frais)}</td>
              <td className="separator-col p-1" style={{border:'none'}}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tableau des références - verrouillé en lecture seule */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2 no-print">
          <h4 className="font-bold">Références des versements</h4>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            🔄 Recharger les références
          </button>
        </div>
        <table className="w-full text-sm border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1" style={{width:'33%'}}>Daty nanaovana ny rotsa-bola</th>
              <th className="border p-1" style={{width:'33%'}}>Sora-bola</th>
              <th className="border p-1" style={{width:'34%'}}>Nomeraon'ny Rosia (référence)</th>
            </tr>
          </thead>
          <tbody>
            {references.map((ref, idx) => (
              <tr key={idx}>
                <td className="border p-1">
                  <input 
                    type="text" 
                    value={ref.date} 
                    readOnly
                    className="w-full" 
                    style={{textAlign:'left', backgroundColor: '#f5f5f5', border: 'none'}}
                  />
                </td>
                <td className="border p-1">
                  <input 
                    type="text" 
                    value={formatNumber(ref.soraBola) || ''}
                    readOnly
                    className="w-full" 
                    style={{textAlign:'right', backgroundColor: '#f5f5f5', border: 'none'}}
                  />
                </td>
                <td className="border p-1">
                  <input 
                    type="text" 
                    value={ref.rosia} 
                    readOnly
                    className="w-full" 
                    style={{textAlign:'left', backgroundColor: '#f5f5f5', border: 'none'}}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs">
        <strong>Fanamarihana:</strong> Ny mpitahiry volan'ny Fiangonana dia manao tatitra ara-bola isam-bolana
      </div>
    </div>
  );
}