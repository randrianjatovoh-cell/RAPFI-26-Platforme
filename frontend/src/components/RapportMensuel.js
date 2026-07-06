import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';
import { formatMonthYear, nombreEnLettresCapitalized, formatNumber } from '../services/helpers';

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date)) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  } catch { return ''; }
}

export default function RapportMensuel({ currentMonth, selectedEglise, readOnly = false }) {
  const { user: contextUser } = useUser();
  const { canViewEglise, canEditEglise, isReadOnly: isGlobalReadOnly } = usePermissions();
  const user = contextUser;
  const eglise = selectedEglise || user?.eglise || '';
  const federation = user?.federation || '';

  const [report, setReport] = useState(null);
  const [saramPandefasana, setSaramPandefasana] = useState(0);
  const [dateVersementFME, setDateVersementFME] = useState("");
  const [rosiaNum, setRosiaNum] = useState("");
  const [dateFanamarihana, setDateFanamarihana] = useState("");
  const [caisseFME, setCaisseFME] = useState("");
  const [soraBolaDate, setSoraBolaDate] = useState("");
  const [soraBolaMontant, setSoraBolaMontant] = useState(0);
  const [soraBolaLettres, setSoraBolaLettres] = useState("");
  const [soraBolaSignataire, setSoraBolaSignataire] = useState("");
  const [chequeLines, setChequeLines] = useState(["", "", "", "", ""]);
  const [soraBolaLines, setSoraBolaLines] = useState(["", "", "", "", ""]);
  const [totalChequeSora, setTotalChequeSora] = useState(0);
  const [totalsBySabbathA, setTotalsBySabbathA] = useState([0, 0, 0, 0, 0]);
  const [totalsBySabbathB, setTotalsBySabbathB] = useState([0, 0, 0, 0, 0]);
  const [totalA, setTotalA] = useState(0);
  const [totalB, setTotalB] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesBySabbath, setExpensesBySabbath] = useState([0, 0, 0, 0, 0]);
  const [balanceChurch, setBalanceChurch] = useState(0);
  const [sabbathDates, setSabbathDates] = useState(["", "", "", "", ""]);
  const [volaSisaTeoAloha, setVolaSisaTeoAloha] = useState(0);
  const [categorySums, setCategorySums] = useState(Array(8).fill().map(() => [0, 0, 0, 0, 0]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Données supplémentaires stockées dans `note` (JSON)
  const [additionalData, setAdditionalData] = useState({
    checkBokyBe: false,
    remarkBokyBe: "",
    checkRapano: false,
    remarkRapano: "",
    checkTatitra: false,
    remarkTatitra: "",
  });

  const isReadOnlyMode = () => {
    if (isGlobalReadOnly()) return true;
    if (readOnly) return true;
    if (!eglise) return true;
    return !canEditEglise(eglise, user?.district, user?.federation);
  };

  // Sauvegarde des données supplémentaires dans `note`
  const saveAdditionalData = async (newData) => {
    if (isReadOnlyMode() || !currentMonth || !eglise) return;
    try {
      const note = JSON.stringify(newData);
      await api.updateReportField(currentMonth, eglise, 'note', note);
    } catch (err) {
      console.error('Erreur sauvegarde note (additional data):', err);
    }
  };

  // Sauvegarde d'un champ simple
  const saveField = async (field, value) => {
    if (isReadOnlyMode() || !currentMonth || !eglise) return;
    try {
      await api.updateReportField(currentMonth, eglise, field, value);
    } catch (err) {
      console.error(`Erreur sauvegarde ${field}:`, err);
    }
  };

  const loadData = async () => {
    if (!currentMonth || !eglise) {
      setLoading(false);
      return;
    }
    if (!canViewEglise(eglise, user?.district, user?.federation)) {
      setError("Vous n'avez pas accès à cette église.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let r = await api.getMonthlyReport(currentMonth, eglise);
      if (!r) {
        console.log(`📝 Rapport manquant, tentative de recréation...`);
        try {
          r = await api.rebuildMonthlyReport(currentMonth, eglise);
        } catch (rebuildErr) {
          console.error('❌ Erreur rebuild:', rebuildErr);
        }
      }
      setReport(r);

      if (r) {
        // Sabbat dates
        if (r.sabbath_dates) {
          try {
            const parsed = JSON.parse(r.sabbath_dates);
            if (Array.isArray(parsed) && parsed.length >= 5) setSabbathDates(parsed);
            else setSabbathDates(["", "", "", "", ""]);
          } catch { setSabbathDates(["", "", "", "", ""]); }
        }

        // Champs simples
        setDateVersementFME(r.dateVersementFME || "");
        setRosiaNum(r.rosiaNum || "");
        setDateFanamarihana(r.dateFanamarihana || "");
        setCaisseFME(r.caisseFME || "");
        setSoraBolaDate(r.soraBolaDate || "");
        setSoraBolaMontant(r.soraBolaMontant || 0);
        setSoraBolaLettres(r.soraBolaLettres || "");
        setSoraBolaSignataire(r.soraBolaSignataire || "");

        // Récupérer les données supplémentaires depuis `note`
        if (r.note) {
          try {
            const parsed = JSON.parse(r.note);
            setAdditionalData(prev => ({ ...prev, ...parsed }));
          } catch {
            // Si ce n'est pas du JSON, on l'ignore
          }
        }

        // Tableau cheque/sora-bola
        if (r.soraBolaLinesJson) {
          try {
            const parsed = JSON.parse(r.soraBolaLinesJson);
            if (parsed.cheque && parsed.soraBola) {
              setChequeLines(parsed.cheque);
              setSoraBolaLines(parsed.soraBola);
              const sum = parsed.soraBola.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
              setTotalChequeSora(sum);
            } else if (Array.isArray(parsed)) {
              setSoraBolaLines(parsed);
              setChequeLines(["", "", "", "", ""]);
              const sum = parsed.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
              setTotalChequeSora(sum);
            }
          } catch {}
        }
      }

      // Frais
      const fraisVal = await api.getFrais(currentMonth, eglise);
      setSaramPandefasana(fraisVal);

      // GL data
      const glData = await api.getGL(currentMonth, null, null, eglise) || {};
      const perSabbathA = [0, 0, 0, 0, 0];
      const perSabbathB = [0, 0, 0, 0, 0];
      const categorySumsArr = Array(8).fill().map(() => [0, 0, 0, 0, 0]);
      for (let s = 1; s <= 5; s++) {
        const entries = glData[s] || [];
        for (const entry of entries) {
          perSabbathA[s - 1] += (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
                                 (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
          perSabbathB[s - 1] += (entry.b9 || 0) + (entry.b10 || 0);
          categorySumsArr[0][s - 1] += entry.f1 || 0;
          categorySumsArr[1][s - 1] += entry.f2 || 0;
          categorySumsArr[2][s - 1] += entry.f3 || 0;
          categorySumsArr[3][s - 1] += entry.f4 || 0;
          categorySumsArr[4][s - 1] += entry.f5 || 0;
          categorySumsArr[5][s - 1] += entry.f6 || 0;
          categorySumsArr[6][s - 1] += entry.f7 || 0;
          categorySumsArr[7][s - 1] += entry.f8 || 0;
        }
      }
      setTotalsBySabbathA(perSabbathA);
      setTotalsBySabbathB(perSabbathB);
      setTotalA(perSabbathA.reduce((a, b) => a + b, 0));
      setTotalB(perSabbathB.reduce((a, b) => a + b, 0));
      setCategorySums(categorySumsArr);

      // Dépenses
      const expensesList = await api.getDepenses(currentMonth, null, null, eglise);
      const totalExp = expensesList.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      setTotalExpenses(totalExp);
      const expensesByWeek = [0, 0, 0, 0, 0];
      if (sabbathDates[0]) {
        for (let exp of expensesList) {
          if (!exp.date) continue;
          const expDate = new Date(exp.date);
          if (isNaN(expDate)) continue;
          for (let i = 0; i < sabbathDates.length; i++) {
            const sabDate = new Date(sabbathDates[i]);
            if (isNaN(sabDate)) continue;
            const startOfWeek = new Date(sabDate);
            startOfWeek.setDate(sabDate.getDate() - 6);
            const endOfWeek = new Date(sabDate);
            if (expDate >= startOfWeek && expDate <= endOfWeek) {
              expensesByWeek[i] += Number(exp.amount) || 0;
              break;
            }
          }
        }
      } else expensesByWeek[0] = totalExp;
      setExpensesBySabbath(expensesByWeek);

      const saved = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
      const sisa = saved ? parseFloat(saved) : 0;
      setVolaSisaTeoAloha(sisa);
      setBalanceChurch(sisa + totalB - totalExp);
    } catch (err) {
      console.error('Erreur chargement RapportMensuel:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, eglise]);

  // Écouter les événements pour recharger quand les données sont mises à jour ailleurs
  useEffect(() => {
    const handleDataUpdate = () => loadData();
    window.addEventListener('data-updated', handleDataUpdate);
    window.addEventListener('frais-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('data-updated', handleDataUpdate);
      window.removeEventListener('frais-updated', handleDataUpdate);
    };
  }, [currentMonth, eglise]);

  // Gestion des champs supplémentaires (avec sauvegarde immédiate)
  const handleAdditionalChange = (field, value) => {
    const newData = { ...additionalData, [field]: value };
    setAdditionalData(newData);
    saveAdditionalData(newData);
  };

  // Tableau cheque/sora-bola
  const updateSoraBolaLine = (idx, rawValue) => {
    if (isReadOnlyMode()) return;
    const numericValue = rawValue.replace(/[^\d.-]/g, '');
    const num = parseFloat(numericValue);
    const newValue = isNaN(num) ? '' : num.toString();
    const newLines = [...soraBolaLines];
    newLines[idx] = newValue;
    setSoraBolaLines(newLines);
    const data = { cheque: chequeLines, soraBola: newLines };
    saveField('soraBolaLinesJson', JSON.stringify(data));
    const sum = newLines.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    setTotalChequeSora(sum);
  };

  const updateChequeLine = (idx, value) => {
    if (isReadOnlyMode()) return;
    const newLines = [...chequeLines];
    newLines[idx] = value;
    setChequeLines(newLines);
    const data = { cheque: newLines, soraBola: soraBolaLines };
    saveField('soraBolaLinesJson', JSON.stringify(data));
  };

  const handleMontantChange = (val) => {
    if (isReadOnlyMode()) return;
    const num = parseFloat(val) || 0;
    setSoraBolaMontant(num);
    const lettres = nombreEnLettresCapitalized(num);
    setSoraBolaLettres(lettres);
    saveField('soraBolaMontant', num);
    saveField('soraBolaLettres', lettres);
  };

  // Composant DateInput simplifié
  const DateInput = ({ value, setter, fieldName, disabled }) => {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value;
          setter(val);
          saveField(fieldName, val);
        }}
        className="rounded p-0.5 date-input"
        style={{ width: '130px' }}
        disabled={disabled}
      />
    );
  };

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur : {error}</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const readOnlyMode = isReadOnlyMode();
  const categories = [
    "Ampahafolony",
    "Sekoly Sabata/S. faha-13",
    "Fanambinana",
    "Tsingerin-taona",
    "Fanompoam-pivavahana",
    "Federasiona",
    "Maneran-tany",
    "Manokana",
    "…...............................",
    "…..............................."
  ];
  const totalNetFederation = totalA - saramPandefasana;
  const displayFederation = (federation || '').toUpperCase();

  const sabbathHeaders = [1, 2, 3, 4, 5].map(i => {
    const dateStr = sabbathDates[i - 1] || '';
    const dateDisplay = formatDateDisplay(dateStr);
    return { label: `Sabata ${i}`, date: dateDisplay };
  });

  return (
    <div className="rapport-mensuel" style={{ maxWidth: '100%', margin: '0 auto', padding: '0 4px', fontSize: '11pt' }}>
      <style>{`
        .rapport-mensuel input { font-family: inherit; font-size: inherit; }
        .rapport-mensuel .border-black { border-color: #000 !important; }
        .rapport-mensuel .protected-cell { background-color: #f9f9f9; }
        .separator-line { width: 1px; height: 50px; background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .cheque-table { table-layout: fixed; width: 100%; }
        .cheque-col { width: 70%; }
        .sora-col { width: 30%; }
        .cheque-col input, .sora-col input { width: 100%; box-sizing: border-box; padding: 2px 4px; border: 1px solid #ccc; border-radius: 2px; }
        .cheque-col input:focus, .sora-col input:focus { outline: 2px solid #1a3c6e; }
        .cheque-table td, .cheque-table th { word-wrap: break-word; overflow-wrap: break-word; text-align: center; }
        .cheque-table .sora-bola-col input { text-align: right; }
        .checkbox-group { display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
        .checkbox-group input[type="checkbox"] { margin: 0; flex-shrink: 0; }
        .checkbox-group .label { margin-left: 2px; }
        .date-input { width: 130px; padding: 2px 4px; border: 1px solid #ccc; border-radius: 2px; }
        .date-input:focus { outline: 2px solid #1a3c6e; }
        .date-input::placeholder { color: transparent !important; }
        @media print {
          @page { size: A4 portrait; margin: 0.1cm; }
          body, .rapport-mensuel { font-size: 7.5pt !important; line-height: 1.15 !important; }
          .no-print { display: none !important; }
          .border, .border-black { border-color: #000 !important; border-width: 0.5pt !important; }
          th, td { padding: 1px 3px !important; }
          input:not([type="checkbox"]):not([type="radio"]) { border: none !important; background: transparent !important; padding: 0 !important; width: 100% !important; box-sizing: border-box !important; font-size: 7.5pt !important; }
          input[type="checkbox"] { appearance: auto !important; -webkit-appearance: checkbox !important; width: 12px !important; height: 12px !important; margin: 0 4px 0 0 !important; display: inline-block !important; opacity: 1 !important; border: 1px solid #000 !important; background: #fff !important; flex-shrink: 0; }
          table { page-break-inside: auto !important; }
          .rapport-mensuel .mb-2 { margin-bottom: 0.1cm !important; }
          .rapport-mensuel .mt-1 { margin-top: 0.05cm !important; }
          .rapport-mensuel .mt-2 { margin-top: 0.1cm !important; }
          .rapport-mensuel .gap-1 { gap: 0.05cm !important; }
          .rapport-mensuel .p-1 { padding: 1px !important; }
          .cheque-table { table-layout: fixed !important; width: 100% !important; }
          .cheque-table .cheque-col { width: 70% !important; }
          .cheque-table .sora-col { width: 30% !important; }
          .cheque-table th, .cheque-table td { padding: 1px 3px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
          .cheque-table input { width: 100% !important; box-sizing: border-box !important; border: none !important; background: transparent !important; padding: 0 2px !important; text-align: left !important; }
          .cheque-table .sora-bola-col input { text-align: right !important; }
          .table-volam-piangonana { table-layout: fixed !important; width: 100% !important; }
          .table-volam-piangonana td { white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
          .table-volam-piangonana th { white-space: normal !important; word-break: break-word !important; }
          .table-volam-piangonana th:nth-child(1), .table-volam-piangonana td:nth-child(1) { width: 28% !important; }
          .table-volam-piangonana th:nth-child(2), .table-volam-piangonana td:nth-child(2), .table-volam-piangonana th:nth-child(3), .table-volam-piangonana td:nth-child(3), .table-volam-piangonana th:nth-child(4), .table-volam-piangonana td:nth-child(4), .table-volam-piangonana th:nth-child(5), .table-volam-piangonana td:nth-child(5), .table-volam-piangonana th:nth-child(6), .table-volam-piangonana td:nth-child(6) { width: 11% !important; }
          .table-volam-piangonana th:nth-child(7), .table-volam-piangonana td:nth-child(7) { width: 17% !important; }
        }
      `}</style>

      <div className="relative mb-1 flex items-start justify-between" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '50px', height: '50px' }}>
            <img src="/FINANCE.png" alt="Finance" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
          </div>
          <div className="separator-line" />
          <div style={{ width: '50px', height: '50px' }}>
            <img src="/Noir.png" alt="Noir" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
          </div>
        </div>
        <div className="flex-1 text-center">
          {displayFederation && <div className="font-bold uppercase" style={{ fontSize: '12pt', marginBottom: '2px' }}>{displayFederation}</div>}
          <div className="font-bold" style={{ fontSize: '13pt' }}>RAPAOROM-BOLAN'NY FIANGONANA</div>
          <div className="italic" style={{ fontSize: '9pt' }}>"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA" (Ohab. 28:20a)</div>
        </div>
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm no-print">Imprimer</button>
      </div>

      <div style={{ height: '10px' }}></div>

      <div style={{ fontSize: '10pt' }} className="mb-2">
        <div className="flex justify-between">
          <div><strong>FIANGONANA:</strong> {eglise}</div>
          <div style={{ textAlign: 'center' }}><strong>Code:</strong> {report?.code || ''}</div>
          <div><strong>Volana:</strong> {formatMonthYear(currentMonth).split(' ')[0]}</div>
        </div>
        <div className="flex justify-between mt-1">
          <div><strong>DISTRIKA:</strong> {user?.district || 'ANTSAHATANTERAKA'}</div>
          <div><strong>Taona:</strong> {currentMonth.split('-')[0]}</div>
        </div>
      </div>

      <h3 className="font-bold mt-1">I- MOMBA NY VOLA HAROTSAKA ANY AMIN'NY FEDERASIONA</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-1">DATY</th>
              {sabbathHeaders.map((h, idx) => (
                <th key={idx} className="border border-black p-1">
                  {h.label}<br />
                  {h.date || ''}
                </th>
              ))}
              <th className="border border-black p-1">TONTALINY</th>
              <th className="border border-black p-1">RAPAORO</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => {
              if (idx >= categories.length - 2) {
                return (
                  <tr key={`category-${idx}`}>
                    <td className="border border-black p-1 font-bold">{cat}</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                    <td className="border p-1 text-right">-</td>
                  </tr>
                );
              }
              const sabVals = categorySums[idx] || [0, 0, 0, 0, 0];
              const total = sabVals.reduce((a, b) => a + b, 0);
              if (idx === 1) {
                let sumRapaoro = 0;
                for (let i = 1; i <= 4; i++) {
                  sumRapaoro += (categorySums[i] || [0, 0, 0, 0, 0]).reduce((a, b) => a + b, 0);
                }
                return (
                  <tr key={`category-${idx}`}>
                    <td className="border p-1 font-bold">{cat}</td>
                    {sabVals.map((v, i) => (
                      <td key={i} className="border p-1 text-right">{formatNumber(v)}</td>
                    ))}
                    <td className="border p-1 text-right font-bold">{formatNumber(total)}</td>
                    <td rowSpan="4" className="border p-1 text-right align-middle font-bold">
                      {formatNumber(sumRapaoro)}
                    </td>
                  </tr>
                );
              } else if (idx >= 2 && idx <= 4) {
                return (
                  <tr key={`category-${idx}`}>
                    <td className="border p-1 font-bold">{cat}</td>
                    {sabVals.map((v, i) => (
                      <td key={i} className="border p-1 text-right">{formatNumber(v)}</td>
                    ))}
                    <td className="border p-1 text-right font-bold">{formatNumber(total)}</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={`category-${idx}`}>
                    <td className="border p-1 font-bold">{cat}</td>
                    {sabVals.map((v, i) => (
                      <td key={i} className="border p-1 text-right">{formatNumber(v)}</td>
                    ))}
                    <td className="border p-1 text-right font-bold">{formatNumber(total)}</td>
                    <td className="border p-1 text-right">{formatNumber(total)}</td>
                  </tr>
                );
              }
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-50">
              <td className="border p-1">TONTALIN'NY VOLA MIAKATRA any @ FME</td>
              {totalsBySabbathA.map((s, i) => (
                <td key={i} className="border p-1 text-right">{formatNumber(s)}</td>
              ))}
              <td className="border p-1 text-right">{formatNumber(totalA)}</td>
              <td className="border p-1 text-right">{formatNumber(totalA)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between items-center mt-1">
        <div>
          <span className="font-bold">Daty nandrotsahana ny vola any amin'ny foibe FME :</span>
          <DateInput value={dateVersementFME} setter={setDateVersementFME} fieldName="dateVersementFME" disabled={readOnlyMode} />
        </div>
        <div className="flex items-center gap-1">
          <span className="font-bold whitespace-nowrap">SARAM-PANDEFASANA (Ar) :</span>
          <input type="text" value={formatNumber(saramPandefasana)} readOnly className="rounded p-0.5 bg-gray-100 text-right text-xs" style={{ width: '100px', fontFamily: 'inherit' }} />
        </div>
      </div>

      <div className="text-right mt-1">
        TONTALIN'NY VOLA MIAKATRA any @ FME :&nbsp;
        <span className="inline-block border border-gray-800 bg-gray-100 px-2 py-0.5 rounded font-bold ml-1">
          {formatNumber(totalNetFederation)} Ar
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-1">
        <div className="border p-1">
          <div className="font-bold mb-1">FANAMARIHANA ATAON'NY MPANAMARIM-BOKY</div>
          <div className="checkbox-group">
            <input type="checkbox" checked={additionalData.checkBokyBe} onChange={e => handleAdditionalChange('checkBokyBe', e.target.checked)} disabled={readOnlyMode} />
            <span className="label">Boky Be :</span>
            <input type="text" value={additionalData.remarkBokyBe} onChange={e => { const val = e.target.value; setAdditionalData(prev => ({...prev, remarkBokyBe: val})); saveAdditionalData({...additionalData, remarkBokyBe: val}); }} className="rounded p-0.5 ml-1" disabled={readOnlyMode} style={{ flex: 1 }} />
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={additionalData.checkRapano} onChange={e => handleAdditionalChange('checkRapano', e.target.checked)} disabled={readOnlyMode} />
            <span className="label">Rapaoro :</span>
            <input type="text" value={additionalData.remarkRapano} onChange={e => { const val = e.target.value; setAdditionalData(prev => ({...prev, remarkRapano: val})); saveAdditionalData({...additionalData, remarkRapano: val}); }} className="rounded p-0.5 ml-1" disabled={readOnlyMode} style={{ flex: 1 }} />
          </div>
          <div className="checkbox-group">
            <input type="checkbox" checked={additionalData.checkTatitra} onChange={e => handleAdditionalChange('checkTatitra', e.target.checked)} disabled={readOnlyMode} />
            <span className="label">Tatitra :</span>
            <input type="text" value={additionalData.remarkTatitra} onChange={e => { const val = e.target.value; setAdditionalData(prev => ({...prev, remarkTatitra: val})); saveAdditionalData({...additionalData, remarkTatitra: val}); }} className="rounded p-0.5 ml-1" disabled={readOnlyMode} style={{ flex: 1 }} />
          </div>
        </div>
        <div className="border p-1">
          <div>
            <span className="font-semibold">Rosia N° :</span>
            <input type="text" value={rosiaNum} onChange={e => { setRosiaNum(e.target.value); saveField('rosiaNum', e.target.value); }} className="rounded p-0.5" style={{ width: '160px' }} disabled={readOnlyMode} />
          </div>
          <div>
            <span className="font-semibold">Daty :</span>
            <DateInput value={dateFanamarihana} setter={setDateFanamarihana} fieldName="dateFanamarihana" disabled={readOnlyMode} />
          </div>
          <div>
            <span className="font-semibold">Anarana sy Sonian'ny CAISSE-FME :</span>
            <input type="text" value={caisseFME} onChange={e => { setCaisseFME(e.target.value); saveField('caisseFME', e.target.value); }} className="rounded p-0.5 w-full" disabled={readOnlyMode} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-1">
        <div className="border p-1">
          <div className="font-bold italic text-center">"Faritra tsy maintsy fenoina eto raha ny pasitora no nandray ny vola"</div>
          <div>
            <span className="font-semibold">Voaray androany (daty) :</span>
            <DateInput value={soraBolaDate} setter={setSoraBolaDate} fieldName="soraBolaDate" disabled={readOnlyMode} />
          </div>
          <div>
            <span className="font-semibold">Ny vola Ar :</span>
            <input type="number" value={soraBolaMontant} onChange={e => handleMontantChange(e.target.value)} className="rounded text-right p-0.5" step="any" disabled={readOnlyMode} />
          </div>
          <div>
            <span className="font-semibold">An-tsoratra :</span>
            <input type="text" value={soraBolaLettres} readOnly style={{ backgroundColor: '#f9f9f9' }} className="rounded p-0.5" />
          </div>
          <div>
            <span className="font-semibold">Anarana sy sonian'ny nandray vola :</span>
            <input type="text" value={soraBolaSignataire} onChange={e => { setSoraBolaSignataire(e.target.value); saveField('soraBolaSignataire', e.target.value); }} className="rounded p-0.5 w-full" disabled={readOnlyMode} />
          </div>
        </div>
        <div className="border p-1">
          <table className="w-full border-collapse cheque-table">
            <thead>
              <tr>
                <th className="border border-black p-0.5 cheque-col">CHEQUE/BANQUE</th>
                <th className="border border-black p-0.5 sora-col">SORA-BOLA</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, idx) => (
                <tr key={idx}>
                  <td className="border border-black p-0 cheque-col">
                    <input type="text" value={chequeLines[idx] || ''} onChange={e => updateChequeLine(idx, e.target.value)} className="w-full p-0.5 border-none" disabled={readOnlyMode} />
                  </td>
                  <td className="border border-black p-0 sora-col sora-bola-col">
                    <input type="text" value={formatNumber(soraBolaLines[idx])} onChange={e => updateSoraBolaLine(idx, e.target.value)} className="w-full p-0.5 border-none" style={{ textAlign: 'right' }} disabled={readOnlyMode} />
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-gray-100">
                <td className="border border-black p-0.5 text-right" style={{ textAlign: 'right' }}>TOTAL :</td>
                <td className="border border-black p-0.5 text-right" style={{ textAlign: 'right' }}>{formatNumber(totalChequeSora)} Ar</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="font-bold mt-2">II- MOMBA NY VOLAM-PIANGONANA ETO AN-TOERANA</h3>
      <div className="overflow-x-auto mt-0">
        <table className="w-full border-collapse border border-black table-volam-piangonana">
          <thead>
            <tr>
              <th className="border border-black p-0.5">ANTONY</th>
              {sabbathHeaders.map((h, idx) => (
                <th key={idx} className="border border-black p-0.5">
                  {h.label} {h.date ? `(${h.date})` : ''}
                </th>
              ))}
              <th className="border border-black p-0.5">TONTALINY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-0.5 font-bold">VOLA SISA tamin'ny volana teo aloha:</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right">{formatNumber(volaSisaTeoAloha)} Ar</td>
            </tr>
            <tr>
              <td className="border p-0.5 font-bold">VOLA NIDITRA nandritra ny volana:</td>
              {totalsBySabbathB.map((s, i) => (
                <td key={i} className="border p-0.5 text-right">{formatNumber(s)} Ar</td>
              ))}
              <td className="border p-0.5 text-right">{formatNumber(totalB)} Ar</td>
            </tr>
            <tr>
              <td className="border p-0.5 font-bold">VOLA NIVOAKA nandritra ny volana:</td>
              {expensesBySabbath.map((s, i) => (
                <td key={i} className="border p-0.5 text-right">{formatNumber(s)} Ar</td>
              ))}
              <td className="border p-0.5 text-right">{formatNumber(totalExpenses)} Ar</td>
            </tr>
            <tr>
              <td className="border p-0.5 font-bold">VOLA SISA tamin'ny faran'ny volana:</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right protected-cell">-</td>
              <td className="border p-0.5 text-right">{formatNumber(balanceChurch)} Ar</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-1 border-t pt-1" style={{ gap: '6px', fontSize: '10pt' }}>
        <div>
          <div className="font-bold">Ny Mpitahiry vola</div>
          <div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div>
        </div>
        <div>
          <div className="font-bold">Ny Mpitahiry vola Mpanampy</div>
          <div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div>
        </div>
        <div>
          <div className="font-bold">Ny Loholona na ny Tale</div>
          <div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div>
        </div>
      </div>
    </div>
  );
}