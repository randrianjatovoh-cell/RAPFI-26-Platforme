// src/components/GrandLivre.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';
import { formatMonthYear, nombreEnLettresCapitalized, escapeHtml, formatNumber, capitalizeFirstLetter } from '../services/helpers';

export default function GrandLivre({ currentMonth, refreshAll, user: propUser, selectedEglise, readOnly = false }) {
  const { user: contextUser } = useUser();
  const { canViewEglise } = usePermissions();
  const user = propUser || contextUser;
  const [sabbathsData, setSabbathsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🔥 Utiliser selectedEglise s'il est fourni, sinon user.eglise
  const eglise = selectedEglise || user?.eglise || '';
  const district = user?.district || '';
  const federation = user?.federation || '';

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
      const report = await api.getMonthlyReport(currentMonth, eglise);
      let sabbathDates = [];
      if (report && report.sabbath_dates) {
        try {
          const parsed = JSON.parse(report.sabbath_dates);
          if (Array.isArray(parsed) && parsed.length >= 5) {
            sabbathDates = parsed;
          }
        } catch (e) {
          console.warn('Erreur parsing sabbath_dates:', e);
        }
      }
      while (sabbathDates.length < 5) {
        sabbathDates.push('');
      }

      // 🔥 On filtre par église dans l'appel API
      const glData = await api.getGL(currentMonth, null, null, eglise) || {};
      const sabbaths = [];
      for (let i = 1; i <= 5; i++) {
        const entries = glData[i] || [];
        let totalA = 0, totalB = 0;
        for (let e of entries) {
          totalA += (e.f1||0)+(e.f2||0)+(e.f3||0)+(e.f4||0)+(e.f5||0)+(e.f6||0)+(e.f7||0)+(e.f8||0);
          totalB += (e.b9||0)+(e.b10||0);
        }
        sabbaths.push({
          index: i,
          entries: entries,
          totalA: totalA,
          totalB: totalB,
          totalAB: totalA + totalB,
          date: sabbathDates[i-1] || ""
        });
      }
      setSabbathsData(sabbaths);
    } catch (err) {
      console.error("Erreur chargement Grand Livre:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, eglise, refreshAll]);

  useEffect(() => {
    const handleDataUpdate = () => {
      loadData();
    };
    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, [currentMonth, eglise]);

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher le Grand Livre.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (error) return <div className="text-center p-4 text-red-600">Erreur : {error}</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const displayDistrict = capitalizeFirstLetter(district);
  const displayEglise = capitalizeFirstLetter(eglise);
  const displayFederation = federation.toUpperCase();

  const SabbathHeader = ({ sabbathDate, pageNum, totalPages }) => {
    const dateDisplay = sabbathDate ? new Date(sabbathDate).toLocaleDateString('fr-FR') : "________";
    return (
      <div className="sabbath-header" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Ligne avec logos et titre */}
        <div className="flex items-center justify-between mb-1" style={{ borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px' }}>
              <img src="/FINANCE.png" alt="Finance" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <div className="separator-line" style={{ width: '1px', height: '40px', backgroundColor: '#000' }} />
            <div style={{ width: '40px', height: '40px' }}>
              <img src="/Noir.png" alt="Noir" style={{ maxHeight: '100%', maxWidth: '100%' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
          </div>
          <div className="text-center flex-1">
            <div className="uppercase font-bold text-sm">{displayFederation}</div>
            <div className="text-xs">"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA"</div>
            <div className="text-xs">Ohabolana 28:20a</div>
          </div>
          <div className="text-right text-xs no-print">
            {/* espace réservé si besoin */}
          </div>
        </div>

        {/* Ligne 1 : Eglise (gauche) et Takelaka (droite) */}
        <div className="flex justify-between items-center text-xs mt-1">
          <div><strong>Eglise :</strong> {escapeHtml(displayEglise)}</div>
          <div><strong>Takelaka :</strong> {pageNum}/{totalPages}</div>
        </div>

        {/* Ligne 2 : District (gauche) et Volana sy Taona (droite) */}
        <div className="flex justify-between items-center text-xs mt-0.5">
          <div><strong>District :</strong> {escapeHtml(displayDistrict)}</div>
          <div><strong>Volana sy Taona :</strong> {formatMonthYear(currentMonth)}</div>
        </div>

        {/* Ligne 3 : Sabata (daty) à gauche */}
        <div className="text-left text-xs mt-0.5">
          <strong>Sabata (daty) :</strong> {dateDisplay}
        </div>
      </div>
    );
  };

  const SignatureBlock = () => (
    <div className="signature-block mt-2 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <div>
          Ny Mpitahiry vola: _______________<br />
          Adiresy: _______________<br />
          Tel n°: _______________<br />
          sonia: _______________
        </div>
        <div className="text-center">
          Hita sy voamarina tamin'ny: _______________<br />
          Ny Loholona (na Ny Tale): _______________<br />
          Sonia: _______________
        </div>
        <div className="text-right">
          Ny Mpitahiry vola: _______________<br />
          Adiresy: _______________<br />
          Tel n°: _______________<br />
          sonia: _______________
        </div>
      </div>
    </div>
  );

  const renderTable = (sabbath) => {
    const entries = sabbath.entries;
    if (entries.length === 0) return <p className="text-center text-gray-500 my-2">Aucune entrée pour ce sabata.</p>;

    const colTotals = {
      f1: entries.reduce((s, e) => s + (e.f1 || 0), 0),
      f2: entries.reduce((s, e) => s + (e.f2 || 0), 0),
      f3: entries.reduce((s, e) => s + (e.f3 || 0), 0),
      f4: entries.reduce((s, e) => s + (e.f4 || 0), 0),
      f5: entries.reduce((s, e) => s + (e.f5 || 0), 0),
      f6: entries.reduce((s, e) => s + (e.f6 || 0), 0),
      f7: entries.reduce((s, e) => s + (e.f7 || 0), 0),
      f8: entries.reduce((s, e) => s + (e.f8 || 0), 0),
      b9: entries.reduce((s, e) => s + (e.b9 || 0), 0),
      b10: entries.reduce((s, e) => s + (e.b10 || 0), 0),
    };
    const totalCols = 16;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-black border-collapse">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th rowSpan="2" className="border p-0.5 text-[7pt] font-bold">N°</th>
              <th rowSpan="2" className="border p-0.5 text-[8pt] font-bold">Anarana na SABATA</th>
              <th rowSpan="2" className="border p-0.5 text-[7pt] font-bold">Rosia n°</th>
              <th rowSpan="2" className="border p-0.5 text-[7pt] font-bold bg-yellow-100">Tontalin'ny A+B</th>
              <th colSpan="9" className="border p-0.5 text-[7pt] font-bold bg-blue-100">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th>
              <th colSpan="3" className="border p-0.5 text-[7pt] font-bold bg-green-100">MIJANONA HO AN'NY FIANGONANA (B)</th>
             </tr>
            <tr className="text-center">
              <th className="border p-0.5 text-[7pt] font-bold">Tontalin'ny A</th>
              <th className="border p-0.5 text-[7pt] font-bold">(1) Ampahafolony</th>
              <th className="border p-0.5 text-[7pt] font-bold">(2) Sekoly Sabata faha-13</th>
              <th className="border p-0.5 text-[7pt] font-bold">(3) Fanambinana</th>
              <th className="border p-0.5 text-[7pt] font-bold">(4) Tsingerin-taona</th>
              <th className="border p-0.5 text-[7pt] font-bold">(5) Fanompoam-pivavahana 50%</th>
              <th className="border p-0.5 text-[7pt] font-bold">(6) Federasiona</th>
              <th className="border p-0.5 text-[7pt] font-bold">(7) Maneran-tany</th>
              <th className="border p-0.5 text-[7pt] font-bold">(8) Manokana</th>
              <th className="border p-0.5 text-[7pt] font-bold">Tontalin'ny B</th>
              <th className="border p-0.5 text-[7pt] font-bold">(9) Fiangonana</th>
              <th className="border p-0.5 text-[7pt] font-bold">(10) Manokana</th>
             </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const sumA = (e.f1||0)+(e.f2||0)+(e.f3||0)+(e.f4||0)+(e.f5||0)+(e.f6||0)+(e.f7||0)+(e.f8||0);
              const sumB = (e.b9||0)+(e.b10||0);
              const sumAB = sumA + sumB;
              return (
                <tr key={e.id || idx}>
                  <td className="border p-0.5 text-center text-[7pt]">{idx+1}</td>
                  <td className="border p-0.5 text-[8pt]">{escapeHtml(e.memberName)}</td>
                  <td className="border p-0.5 text-[7pt]">{escapeHtml(e.rosia)}</td>
                  <td className="border p-0.5 text-right font-bold text-[8pt] bg-yellow-50">{formatNumber(sumAB)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(sumA)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f1)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f2)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f3)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f4)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f5)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f6)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f7)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.f8)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(sumB)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.b9)}</td>
                  <td className="border p-0.5 text-right text-[8pt]">{formatNumber(e.b10)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td colSpan="3" className="border p-0.5 text-right text-[7pt]">TOTAL</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(sabbath.totalAB)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(sabbath.totalA)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f1)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f2)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f3)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f4)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f5)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f6)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f7)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.f8)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(sabbath.totalB)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.b9)}</td>
              <td className="border p-0.5 text-right text-[8pt]">{formatNumber(colTotals.b10)}</td>
            </tr>
            <tr className="bg-white">
              <td colSpan={totalCols} className="border p-0.5 text-left text-[7pt]">
                <strong>Tontalin'ny vola rehetra niditra sy voaisa (A+B) (Atao an-tsoratra) Ar :</strong>{" "}
                {nombreEnLettresCapitalized(sabbath.totalAB)} Ariary.-
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-xl font-bold">Grand Livre détaillé</h2>
        <button onClick={() => window.print()} className="bg-gray-600 text-white px-3 py-1 rounded">
          <i className="fas fa-print"></i> Imprimer
        </button>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.05cm 0.01cm;
          }
          body, .grand-livre-print {
            font-size: 9pt !important;
            line-height: 1 !important;
          }
          .no-print { display: none !important; }
          table {
            font-size: 7.5pt !important;
            page-break-inside: auto !important;
          }
          th {
            font-size: 7pt !important;
            font-weight: bold !important;
          }
          td {
            font-size: 8pt !important;
          }
          th, td {
            padding: 0.5px 1px !important;
          }
          .border, .border-black {
            border-color: #000 !important;
            border-width: 0.3pt !important;
          }
          .sabbath-container {
            page-break-before: always;
          }
          .sabbath-container:first-of-type {
            page-break-before: auto;
          }
          .sabbath-header {
            page-break-after: avoid;
          }
          .signature-block {
            page-break-inside: avoid;
            page-break-before: avoid;
          }
          .sabbath-header {
            margin-bottom: 2px !important;
          }
          .signature-block {
            margin-top: 2px !important;
          }
          .separator-line {
            background-color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        .sabbath-container:not(:first-child) {
          border-top: 2px solid #333;
          padding-top: 8px;
          margin-top: 8px;
        }
        .separator-line {
          width: 1px;
          height: 40px;
          background-color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      {sabbathsData.map((sabbath, idx) => (
        <div 
          key={sabbath.index} 
          className={`grand-livre-print sabbath-container`}
          style={{ 
            borderTop: idx === 0 ? 'none' : '2px solid #333',
            paddingTop: idx === 0 ? '0' : '8px',
            marginTop: idx === 0 ? '0' : '8px'
          }}
        >
          <SabbathHeader sabbathDate={sabbath.date} pageNum={idx+1} totalPages={sabbathsData.length} />
          {renderTable(sabbath)}
          <SignatureBlock />
        </div>
      ))}
    </div>
  );
}