import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, nombreEnLettresCapitalized, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

export default function RecapGL({ currentMonth, refreshAll, user: propUser, selectedEglise, readOnly = false }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [sabTotals, setSabTotals] = useState({});
  const [frais, setFraisState] = useState(0);
  const [fraisDisplay, setFraisDisplay] = useState('0');
  const [totals, setTotals] = useState({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
  const [loading, setLoading] = useState(true);
  
  const eglise = selectedEglise || user?.eglise || '';
  const district = user?.district || '';
  const federation = user?.federation || '';
  const inputRef = useRef(null);
  const lastSavedFrais = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Sauvegarde automatique (sans refreshAll)
  useEffect(() => {
    if (readOnly || !currentMonth || !eglise) return;

    const saveFrais = async () => {
      const num = parseInt(fraisDisplay.replace(/\s/g, ''), 10) || 0;
      if (lastSavedFrais.current === num) return;
      
      try {
        await api.saveFrais(currentMonth, eglise, num);
        lastSavedFrais.current = num;
        // ✅ On ne refreshAll plus ici pour éviter les boucles
        // On notifie seulement via un événement personnalisé
        window.dispatchEvent(new CustomEvent('frais-updated', { detail: { month: currentMonth, eglise, frais: num } }));
      } catch (err) {
        console.error('Erreur sauvegarde frais :', err);
      }
    };

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveFrais, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [fraisDisplay, currentMonth, eglise, readOnly]);

  // Écouter les mises à jour externes (ex: depuis un autre onglet)
  useEffect(() => {
    const handleFraisUpdate = (e) => {
      if (e.detail && e.detail.eglise === eglise && e.detail.month === currentMonth) {
        loadData();
      }
    };
    window.addEventListener('frais-updated', handleFraisUpdate);
    return () => window.removeEventListener('frais-updated', handleFraisUpdate);
  }, [currentMonth, eglise]);

  useEffect(() => {
    if (currentMonth && eglise) loadData();
    else setLoading(false);
  }, [currentMonth, refreshAll, eglise]);

  async function loadData() {
    setLoading(true);
    try {
      const glData = await api.getGL(currentMonth, null, null, eglise) || {};
      const perSabbath = {};
      for (let s = 1; s <= 5; s++) {
        perSabbath[s] = { f1:0, f2:0, f3:0, f4:0, f5:0, f6:0, f7:0, f8:0, b9:0, b10:0 };
      }
      for (let s = 1; s <= 5; s++) {
        const entries = glData[s] || [];
        for (const ent of entries) {
          perSabbath[s].f1 += ent.f1 || 0;
          perSabbath[s].f2 += ent.f2 || 0;
          perSabbath[s].f3 += ent.f3 || 0;
          perSabbath[s].f4 += ent.f4 || 0;
          perSabbath[s].f5 += ent.f5 || 0;
          perSabbath[s].f6 += ent.f6 || 0;
          perSabbath[s].f7 += ent.f7 || 0;
          perSabbath[s].f8 += ent.f8 || 0;
          perSabbath[s].b9 += ent.b9 || 0;
          perSabbath[s].b10 += ent.b10 || 0;
        }
      }
      setSabTotals(perSabbath);

      const newTotals = { f1:0, f2:0, f3:0, f4:0, f5:0, f6:0, f7:0, f8:0, b9:0, b10:0 };
      for (let s = 1; s <= 5; s++) {
        const p = perSabbath[s];
        newTotals.f1 += p.f1;
        newTotals.f2 += p.f2;
        newTotals.f3 += p.f3;
        newTotals.f4 += p.f4;
        newTotals.f5 += p.f5;
        newTotals.f6 += p.f6;
        newTotals.f7 += p.f7;
        newTotals.f8 += p.f8;
        newTotals.b9 += p.b9;
        newTotals.b10 += p.b10;
      }
      setTotals(newTotals);

      const fraisVal = await api.getFrais(currentMonth, eglise);
      setFraisState(fraisVal);
      const displayVal = fraisVal ? formatNumber(fraisVal) : '0';
      setFraisDisplay(displayVal);
      lastSavedFrais.current = fraisVal;
    } catch (err) {
      console.error('Erreur chargement RecapGL:', err);
    } finally {
      setLoading(false);
    }
  }

  const formatWithSpaces = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleFraisChange = (e) => {
    if (readOnly) return;
    const raw = e.target.value;
    const numeric = raw.replace(/\D/g, '');
    const num = parseInt(numeric, 10) || 0;
    setFraisState(num);
    setFraisDisplay(formatWithSpaces(num));
  };

  const handleFraisBlur = async () => {
    if (readOnly) return;
    const num = parseInt(fraisDisplay.replace(/\s/g, ''), 10) || 0;
    setFraisState(num);
    setFraisDisplay(formatWithSpaces(num));
    try {
      await api.saveFrais(currentMonth, eglise, num);
      lastSavedFrais.current = num;
      window.dispatchEvent(new CustomEvent('frais-updated', { detail: { month: currentMonth, eglise, frais: num } }));
      if (refreshAll && typeof refreshAll === 'function') refreshAll();
    } catch (err) {
      console.error('Erreur sauvegarde frais (blur):', err);
    }
  };

  const handleFraisKeyDown = (e) => {
    if (readOnly) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher le récapitulatif.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const totalA = totals.f1 + totals.f2 + totals.f3 + totals.f4 + totals.f5 + totals.f6 + totals.f7 + totals.f8;
  const totalB = totals.b9 + totals.b10;
  const totalAB = totalA + totalB;
  const safeTotalAB = isNaN(totalAB) ? 0 : totalAB;
  const totalEnLettres = nombreEnLettresCapitalized(safeTotalAB);
  const netFederation = totalA - frais;

  const displayEglise = capitalizeFirstLetter(eglise);
  const displayDistrict = capitalizeFirstLetter(district);
  const displayFederation = (federation || '').toUpperCase();

  const colHeadersA = [
    { key: 'f1', label: '(1) Ampahafolony' },
    { key: 'f2', label: '(2) Sekoly Sabata faha-13' },
    { key: 'f3', label: '(3) Fanambinana' },
    { key: 'f4', label: '(4) Tsingerin-taona' },
    { key: 'f5', label: '(5) Fanompoam-pivavahana 50%' },
    { key: 'f6', label: '(6) Federasiona' },
    { key: 'f7', label: '(7) Maneran-tany' },
    { key: 'f8', label: '(8) Manokana' }
  ];
  const colHeadersB = [
    { key: 'b9', label: '(9) Fiangonana' },
    { key: 'b10', label: '(10) Manokana' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-3 no-print">
        <h2 className="text-xl font-bold">RÉCAPITULATIF GRAND LIVRE</h2>
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm">
          <i className="fas fa-print"></i> Imprimer
        </button>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0.1cm; }
          body, .recap-print { font-size: 8pt !important; line-height: 1 !important; }
          .no-print { display: none !important; }
          table { font-size: 7pt !important; page-break-inside: auto !important; }
          th, td { padding: 1px 2px !important; }
          .border, .border-black { border-color: #000 !important; border-width: 0.3pt !important; }
          .recap-print .text-sm { font-size: 7pt !important; }
          .recap-print .text-xs { font-size: 6pt !important; }
          .recap-print .text-lg { font-size: 9pt !important; }
          .col-num { width: 25px; }
          .col-name { width: 100px; }
          .col-rosia { width: 60px; }
          .col-totalab { width: 70px; }
          .col-federation { min-width: 30px; }
          .col-eglise { min-width: 30px; }
          .recap-print .mb-2 { margin-bottom: 0.1cm !important; }
          .recap-print .mt-2 { margin-top: 0.1cm !important; }
          .separator-line { background-color: #000 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        .recap-print td, .recap-print th { padding: 2px 4px; }
        .rosia-col { background-color: #e5e7eb !important; color: #6b7280; text-align: center; font-style: italic; cursor: not-allowed; }
        .rosia-col::before { content: "—"; }
        .rosia-col span { display: none; }
        .recap-print .text-sm { font-size: 0.875rem; }
        .recap-print .text-xs { font-size: 0.75rem; }
        .recap-print .text-lg { font-size: 1.125rem; }
        .recap-print td, .recap-print th { padding: 0.25rem 0.4rem; }
        .recap-print .mb-2 { margin-bottom: 0.25rem; }
        .recap-print .mt-2 { margin-top: 0.25rem; }
        .recap-print .mt-1 { margin-top: 0.1rem; }
        .recap-print .gap-2 { gap: 0.2rem; }
        .recap-print .gap-3 { gap: 0.3rem; }
        .separator-line { width: 1px; height: 50px; background-color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <div className="recap-print">
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
            <div className="font-bold uppercase text-base">{displayFederation}</div>
            <div className="font-bold text-sm">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA"</div>
            <div className="text-xs">Ohabolana 28:20a</div>
          </div>
          <div className="text-right text-sm no-print" style={{ width: '80px' }}></div>
        </div>

        <div className="flex justify-between items-center text-xs mb-1">
          <div><strong>Eglise :</strong> {escapeHtml(displayEglise)}</div>
          <div><strong>Takelaka :</strong> RÉCAP</div>
        </div>

        <div className="flex justify-between items-center text-xs mb-1">
          <div><strong>District :</strong> {escapeHtml(displayDistrict)}</div>
          <div><strong>Volana sy Taona :</strong> {formatMonthYear(currentMonth)}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-black text-sm">
            <thead className="bg-gray-100">
              <tr className="text-center">
                <th rowSpan="2" className="border p-0.5 col-num">N°</th>
                <th rowSpan="2" className="border p-0.5 col-name">Anarana na SABATA</th>
                <th rowSpan="2" className="border p-0.5 col-rosia rosia-col">Rosia n°</th>
                <th rowSpan="2" className="border p-0.5 col-totalab bg-yellow-100">Tontalin'ny A+B</th>
                <th colSpan="9" className="border p-0.5 bg-blue-100 col-federation">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th>
                <th colSpan="3" className="border p-0.5 bg-green-100 col-eglise">MIJANONA HO AN'NY FIANGONANA (B)</th>
              </tr>
              <tr className="text-center text-xs">
                <th className="border p-0.5">Tontalin'ny A</th>
                {colHeadersA.map(h => <th key={h.key} className="border p-0.5">{h.label}</th>)}
                <th className="border p-0.5">Tontalin'ny B</th>
                {colHeadersB.map(h => <th key={h.key} className="border p-0.5">{h.label}</th>)}
              </tr>
            </thead>
            <tbody className="text-xs">
              {[1,2,3,4,5].map(s => {
                const p = sabTotals[s] || { f1:0, f2:0, f3:0, f4:0, f5:0, f6:0, f7:0, f8:0, b9:0, b10:0 };
                const sumA = p.f1 + p.f2 + p.f3 + p.f4 + p.f5 + p.f6 + p.f7 + p.f8;
                const sumB = p.b9 + p.b10;
                const sumAB = sumA + sumB;
                return (
                  <tr key={s}>
                    <td className="border p-0.5 text-center">{s}</td>
                    <td className="border p-0.5 font-bold">Sabata Faha-{s}</td>
                    <td className="border p-0.5 rosia-col text-center">—</td>
                    <td className="border p-0.5 text-right">{formatNumber(sumAB)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(sumA)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f1)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f2)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f3)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f4)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f5)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f6)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f7)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.f8)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(sumB)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.b9)}</td>
                    <td className="border p-0.5 text-right">{formatNumber(p.b10)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold text-xs">
              <tr>
                <td colSpan="3" className="border p-0.5 text-right">TOTAL GÉNÉRAL</td>
                <td className="border p-0.5 text-right">{formatNumber(totalAB)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totalA)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f1)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f2)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f3)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f4)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f5)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f6)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f7)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.f8)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totalB)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.b9)}</td>
                <td className="border p-0.5 text-right">{formatNumber(totals.b10)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-1 text-sm">
          <div className="text-xs">
            <strong>Tontalin'ny vola rehetra niditra sy voaisa (A+B) (Atao an-tsoratra) Ar :</strong> {totalEnLettres} Ariary.-
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs">
            <strong>Saram-pandefasana :</strong>
            <input
              ref={inputRef}
              type="text"
              value={fraisDisplay}
              onChange={handleFraisChange}
              onBlur={handleFraisBlur}
              onKeyDown={handleFraisKeyDown}
              className="px-1 py-0 w-20 text-right border rounded text-sm"
              style={{ fontSize: 'inherit' }}
              disabled={readOnly}
            />
            <span>Ar</span>
          </div>
          <div className="text-xs mt-0.5">
            <strong>Tontalin'ny vola harotsaka amin'ny Federation :</strong> {formatNumber(netFederation)} Ar
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
          <div className="text-left">
            Ny Mpitahiry vola: _______________<br/>
            Adiresy: _______________<br/>
            Tel n°: _______________<br/>
            sonia: _______________
          </div>
          <div className="text-center">
            Hita sy voamarina tamin'ny: _______________<br/>
            Ny Loholona (na Ny Tale): _______________<br/>
            Sonia: _______________
          </div>
          <div className="text-right">
            Ny Mpitahiry vola: _______________<br/>
            Adiresy: _______________<br/>
            Tel n°: _______________<br/>
            sonia: _______________
          </div>
        </div>
      </div>
    </div>
  );
}