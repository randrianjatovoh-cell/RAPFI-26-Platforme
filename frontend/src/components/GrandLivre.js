// src/components/GrandLivre.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, nombreEnLettresCapitalized, escapeHtml, formatNumber, capitalizeFirstLetter } from '../services/helpers';

export default function GrandLivre({ currentMonth, refreshAll, user: propUser, selectedEglise }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const [sabbathsData, setSabbathsData] = useState([]);
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
      const report = await api.getMonthlyReport(currentMonth, eglise);
      const sabbathDates = report?.sabbathDates || [];
      const glData = await api.getGL(currentMonth) || {};
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois pour afficher le Grand Livre.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const displayDistrict = capitalizeFirstLetter(district);
  const displayEglise = capitalizeFirstLetter(eglise);
  const displayFederation = federation.toUpperCase();

  const SabbathHeader = ({ sabbathDate, pageNum, totalPages }) => (
    <div className="mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="flex justify-between items-start text-sm">
        <div className="text-left">
          <div><strong>Eglise :</strong> {escapeHtml(displayEglise)}</div>
          <div><strong>District :</strong> {escapeHtml(displayDistrict)}</div>
          <div><strong>Sabata (daty) :</strong> {sabbathDate || "________"}</div>
        </div>
        <div className="text-center">
          <div className="uppercase font-bold">{displayFederation}</div>
          <div>"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA"</div>
          <div>Ohabolana 28:20a</div>
        </div>
        <div className="text-right">
          <div>Takelaka: {pageNum}/{totalPages}</div>
          <div>Volana sy Taona: {formatMonthYear(currentMonth)}</div>
        </div>
      </div>
    </div>
  );

  const SignatureBlock = () => (
    <div className="mt-3 text-sm">
      <div className="grid grid-cols-3 gap-4">
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
    if (entries.length === 0) return <p className="text-center text-gray-500 my-4">Aucune entrée pour ce sabata.</p>;

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
              <th rowSpan="2" className="border p-1">N°</th>
              <th rowSpan="2" className="border p-1">Anarana na SABATA</th>
              <th rowSpan="2" className="border p-1">Rosia n°</th>
              <th rowSpan="2" className="border p-1 bg-yellow-100">Tontalin'ny A+B</th>
              <th colSpan="9" className="border p-1 bg-blue-100">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th>
              <th colSpan="3" className="border p-1 bg-green-100">MIJANONA HO AN'NY FIANGONANA (B)</th>
            </tr>
            <tr className="text-xs text-center">
              <th className="border p-1">Tontalin'ny A</th>
              <th className="border p-1">(1) Ampahafolony</th>
              <th className="border p-1">(2) Sekoly Sabata faha-13</th>
              <th className="border p-1">(3) Fanambinana</th>
              <th className="border p-1">(4) Tsingerin-taona</th>
              <th className="border p-1">(5) Fanompoam-pivavahana 50%</th>
              <th className="border p-1">(6) Federasiona</th>
              <th className="border p-1">(7) Maneran-tany</th>
              <th className="border p-1">(8) Manokana</th>
              <th className="border p-1">Tontalin'ny B</th>
              <th className="border p-1">(9) Fiangonana</th>
              <th className="border p-1">(10) Manokana</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, idx) => {
              const sumA = (e.f1||0)+(e.f2||0)+(e.f3||0)+(e.f4||0)+(e.f5||0)+(e.f6||0)+(e.f7||0)+(e.f8||0);
              const sumB = (e.b9||0)+(e.b10||0);
              const sumAB = sumA + sumB;
              return (
                <tr key={e.id || idx}>
                  <td className="border p-1 text-center">{idx+1}</td>
                  <td className="border p-1">{escapeHtml(e.memberName)}</td>
                  <td className="border p-1">{escapeHtml(e.rosia)}</td>
                  <td className="border p-1 text-right font-bold bg-yellow-50">{formatNumber(sumAB)}</td>
                  <td className="border p-1 text-right">{formatNumber(sumA)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f1)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f2)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f3)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f4)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f5)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f6)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f7)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.f8)}</td>
                  <td className="border p-1 text-right">{formatNumber(sumB)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.b9)}</td>
                  <td className="border p-1 text-right">{formatNumber(e.b10)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50 font-semibold">
            <tr>
              <td colSpan="3" className="border text-right">TOTAL</td>
              <td className="border text-right">{formatNumber(sabbath.totalAB)}</td>
              <td className="border text-right">{formatNumber(sabbath.totalA)}</td>
              <td className="border text-right">{formatNumber(colTotals.f1)}</td>
              <td className="border text-right">{formatNumber(colTotals.f2)}</td>
              <td className="border text-right">{formatNumber(colTotals.f3)}</td>
              <td className="border text-right">{formatNumber(colTotals.f4)}</td>
              <td className="border text-right">{formatNumber(colTotals.f5)}</td>
              <td className="border text-right">{formatNumber(colTotals.f6)}</td>
              <td className="border text-right">{formatNumber(colTotals.f7)}</td>
              <td className="border text-right">{formatNumber(colTotals.f8)}</td>
              <td className="border text-right">{formatNumber(sabbath.totalB)}</td>
              <td className="border text-right">{formatNumber(colTotals.b9)}</td>
              <td className="border text-right">{formatNumber(colTotals.b10)}</td>
            </tr>
            <tr className="bg-white">
              <td colSpan={totalCols} className="border p-1 text-left text-xs">
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
          @page { size: A4 landscape; margin: 0.4cm; }
          body, .grand-livre-print { font-size: 9pt !important; line-height: 1.1 !important; }
          .no-print { display: none !important; }
          table { font-size: 7.5pt !important; page-break-inside: avoid !important; }
          th, td { padding: 1px 2px !important; }
          .border, .border-black { border-color: #000 !important; border-width: 0.5pt !important; }
          .break-before-page { page-break-before: always; }
        }
      `}</style>

      {sabbathsData.map((sabbath, idx) => (
        <div key={sabbath.index} className={`grand-livre-print ${idx !== 0 ? 'break-before-page' : ''}`} style={{ pageBreakBefore: idx === 0 ? 'auto' : 'always' }}>
          <SabbathHeader sabbathDate={sabbath.date} pageNum={idx+1} totalPages={sabbathsData.length} />
          {renderTable(sabbath)}
          <SignatureBlock />
        </div>
      ))}
    </div>
  );
}