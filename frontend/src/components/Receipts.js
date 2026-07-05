// src/components/Receipts.js
import React from 'react';
import { formatNumber, nombreEnLettresCapitalized } from '../services/helpers';

export default function Receipts({ entries, eglise, district, federation, sabbathDate, monthId, sabbathIndex, onClose }) {
  const validEntries = entries.filter(e => e.memberName && (
    (e.f1 || 0) + (e.f2 || 0) + (e.f3 || 0) + (e.f4 || 0) +
    (e.f5 || 0) + (e.f6 || 0) + (e.f7 || 0) + (e.f8 || 0) +
    (e.b9 || 0) + (e.b10 || 0) > 0
  ));

  if (validEntries.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        Aucune donnée pour générer des reçus.
        <button onClick={onClose} className="ml-4 bg-gray-600 text-white px-4 py-2 rounded">Fermer</button>
      </div>
    );
  }

  const chunkSize = 4;
  const receiptChunks = [];
  for (let i = 0; i < validEntries.length; i += chunkSize) {
    receiptChunks.push(validEntries.slice(i, i + chunkSize));
  }

  const monthName = monthId ? new Date(monthId + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  const sabbathLabel = sabbathIndex ? `Sabata Faha-${sabbathIndex}` : '';
  const formattedDistrict = district ? district.charAt(0).toUpperCase() + district.slice(1).toLowerCase() : '________';

  const renderReceipt = (entry, key) => {
    const total = (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
                  (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0) +
                  (entry.b9 || 0) + (entry.b10 || 0);
    const totalLetters = nombreEnLettresCapitalized(total);
    const dateStr = sabbathDate ? new Date(sabbathDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '___/__/____';
    const rosiaNumber = entry.rosia || '________';

    const f1 = entry.f1 || 0;
    const f2 = entry.f2 || 0;
    const f3 = entry.f3 || 0;
    const f4 = entry.f4 || 0;
    const f5 = entry.f5 || 0;
    const f6 = entry.f6 || 0;
    const f7 = entry.f7 || 0;
    const f8 = entry.f8 || 0;
    const b9 = entry.b9 || 0;
    const b10 = entry.b10 || 0;

    const rows = [
      { label: 'Sekoly Sabata / S. faha-13', miakatra: f2, mijanona: b9 },
      { label: 'Fanambinana', miakatra: f3, mijanona: 0 },
      { label: 'Tingerin-tana', miakatra: f4, mijanona: 0 },
      { label: 'Fanompoam-pivavahana', miakatra: f5, mijanona: b10 },
      { label: 'Federasion', miakatra: f6, mijanona: 0 },
      { label: 'Maneran-tany', miakatra: f7, mijanona: 0 },
      { label: 'Manokana 1', miakatra: f8, mijanona: 0 },
      { label: 'Manokana 2', miakatra: 0, mijanona: 0 },
      { label: 'Manokana 3', miakatra: 0, mijanona: 0 },
    ];

    let totalMiakatra = 0, totalMijanona = 0;
    rows.forEach(row => {
      totalMiakatra += row.miakatra || 0;
      totalMijanona += row.mijanona || 0;
    });

    const totalFanatitra = totalMiakatra + totalMijanona;
    const totalNarotsaka = f1 + totalFanatitra;

    return (
      <div key={key} className="receipt">
        <div className="receipt-header">
          <div className="header-top">
            <div className="logo-title-group">
              <img 
                src="/FINANCE.png" 
                alt="Finance" 
                className="header-logo" 
                onError={(e) => e.target.style.display = 'none'} 
              />
              <img 
                src="/Noir.png" 
                alt="Noir" 
                className="header-logo" 
                onError={(e) => e.target.style.display = 'none'} 
              />
              <div className="church-titles">
                <div className="church-line">FIANGONANA ADVANTISTA</div>
                <div className="sabbath-line">MITANDRINA NY ANDRO FAHA-FITO</div>
                <div className="federation-line">{federation || 'FEDERASIONA'}</div>
              </div>
            </div>
            <div className="rosia-number">ROSIA N° {rosiaNumber}</div>
          </div>
        </div>

        <div className="receipt-body">
          <div className="title-box">
            <div className="receipt-title">AMPAHAFOLONY SY FANATITRA HO AN'I JEHOVAH</div>
            <div className="verse">Chak 28:20a « vifany olona mahatotely tokoa dia ho be fitakianana »</div>
          </div>

          <div className="member-info">
            <div className="member-line">
              <span className="label">Fiangonana ao :</span>
              <span className="value">{eglise || '________'}</span>
              <span className="label district-label">DISTRIKA :</span>
              <span className="value">{formattedDistrict}</span>
            </div>
            <div className="member-line">
              <span className="label">Voaray tamin-dR :</span>
              <span className="value">{entry.memberName || '________'}</span>
            </div>
          </div>

          <div className="amount-row">
            <div className="amount-left"><span className="label">Ny vola :</span> <span className="value">{formatNumber(totalNarotsaka)} Ar</span></div>
            <div className="amount-right"><span className="label">An-tsoratra :</span> <span className="value">{totalLetters} Ar</span></div>
          </div>

          <table className="receipt-table">
            <tbody>
              <tr>
                <td className="title-cell">AMPAHAFOLONY</td>
                <td className="amount-cell border-right-cell" colSpan="2">{formatNumber(f1)}</td>
                <td className="signature-cell"></td>
              </tr>
              <tr>
                <td className="title-cell">FANATITRA</td>
                <td className="header-cell">Fanatitra Miakatra</td>
                <td className="header-cell">Fanatitra Mijanona</td>
                <td className="signature-cell"></td>
              </tr>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="category-cell">{row.label}</td>
                  <td className="amount-cell">{formatNumber(row.miakatra)}</td>
                  <td className="amount-cell">{formatNumber(row.mijanona)}</td>
                  <td className="signature-cell">
                    {row.label === 'Fanambinana' && <div className="signature-placeholder">Sonian'ny mpitahiry vola</div>}
                    {row.label === 'Manokana 2' && <div className="signature-placeholder">_______________</div>}
                    {row.label === 'Manokana 3' && <div className="signature-placeholder">Daty : {dateStr}</div>}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="title-cell">Tontalin'ny fanatitra</td>
                <td className="total-cell">{formatNumber(totalMiakatra)}</td>
                <td className="total-cell">{formatNumber(totalMijanona)}</td>
                <td className="signature-cell"></td>
              </tr>
              <tr>
                <td className="title-cell">Tontalin'ny vola narotsaka</td>
                <td className="total-cell border-right-cell" colSpan="2">{formatNumber(totalNarotsaka)}</td>
                <td className="signature-cell"></td>
              </tr>
            </tbody>
          </table>

          <div className="footer-note">(Rosia omena ny mambra mamerina ny 1/10 sy ny fanatitra)</div>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="receipts-container">
      <div className="receipts-header no-print flex justify-between items-center mb-4 p-3 bg-gray-100 rounded">
        <h2 className="text-xl font-bold">Reçus personnels - {monthName} - {sabbathLabel}</h2>
        <div className="flex gap-2">
          <button onClick={onClose} className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
            <i className="fas fa-arrow-left mr-2"></i> Retour
          </button>
          <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            <i className="fas fa-print mr-2"></i> Imprimer
          </button>
        </div>
      </div>

      {receiptChunks.map((chunk, chunkIndex) => (
        <div key={chunkIndex} className="print-page">
          <div className="receipts-grid">
            {chunk.map((entry, idx) => renderReceipt(entry, chunkIndex * chunkSize + idx))}
          </div>
        </div>
      ))}

      <style>{`
        /* --- Styles écran --- */
        .receipts-container {
          margin-top: 1rem;
          padding: 0 0.5rem;
        }
        .receipts-header {
          background: #f3f4f6;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }
        .receipts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.3rem;
          margin-bottom: 0.5rem;
        }
        .receipt {
          border: 1.5px solid #000;
          padding: 0.2rem 0.4rem;
          font-size: 8.5px;
          font-family: 'Times New Roman', serif;
          background: #fff;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .receipt-header {
          border-bottom: none !important;
          padding-bottom: 1px;
          margin-bottom: 1px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-title-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .header-logo {
          height: 25px;
          width: auto;
        }
        .church-titles {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
          margin-left: 2px;
        }
        .church-titles .church-line,
        .church-titles .sabbath-line,
        .church-titles .federation-line {
          font-weight: bold;
          font-size: 8.5px;
          margin: 0;
          padding: 0;
        }
        .rosia-number {
          font-weight: bold;
          font-size: 8.5px;
          text-align: right;
          white-space: nowrap;
        }
        .receipt-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
        }
        .title-box {
          border: 1px solid #000;
          padding: 1px 3px;
          margin-bottom: 1px;
          text-align: center;
        }
        .receipt-title {
          font-weight: bold;
          font-size: 8.5px;
          letter-spacing: 0.3px;
          margin: 0;
          padding: 0;
        }
        .verse {
          font-style: italic;
          font-size: 6px;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .member-info {
          font-size: 7px;
          margin: 1px 0;
          border-bottom: none !important;
          padding-bottom: 1px;
        }
        .member-line {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          flex-wrap: wrap;
          margin: 0;
          padding: 0;
        }
        .member-line .label {
          font-weight: bold;
          min-width: 50px;
          margin: 0;
          padding: 0;
        }
        .member-line .district-label {
          min-width: 35px;
          margin-left: 0.3rem;
        }
        .member-line .value {
          margin: 0;
          padding: 0;
        }
        .amount-row {
          display: flex;
          justify-content: space-between;
          font-size: 7px;
          font-weight: bold;
          margin: 1px 0;
          border-bottom: 1px solid #000;
          padding-bottom: 1px;
        }
        .amount-left, .amount-right {
          margin: 0;
          padding: 0;
        }
        .amount-right {
          text-align: right;
        }
        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 6px;
          margin: 1px 0;
          line-height: 1.1;
          border-spacing: 0;
        }
        .receipt-table td {
          border: 1px solid #000;
          border-right: none;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          padding: 0.5px 1px;
          text-align: center;
          vertical-align: middle;
          margin: 0;
          line-height: 1.1;
        }
        .receipt-table td:first-child {
          border-left: 1px solid #000;
        }
        .receipt-table td:nth-child(3) {
          border-right: 1px solid #000;
        }
        .receipt-table td:last-child {
          border: none !important;
          background: transparent;
        }
        .receipt-table .border-right-cell {
          border-right: 1px solid #000 !important;
        }
        .receipt-table .title-cell {
          text-align: left;
          font-weight: bold;
          padding-left: 3px;
        }
        .receipt-table .header-cell {
          text-align: center;
          font-weight: bold;
          background: #f0f0f0;
        }
        .receipt-table .category-cell {
          text-align: left;
          font-weight: bold;
          padding-left: 3px;
        }
        .receipt-table .amount-cell {
          text-align: right;
          padding-right: 3px;
        }
        .receipt-table .total-cell {
          text-align: right;
          font-weight: bold;
          padding-right: 3px;
        }
        .receipt-table .signature-cell {
          text-align: center;
          font-size: 5.5px;
          min-width: 25px;
          border: none !important;
          padding: 0.5px 0;
        }
        .signature-placeholder {
          font-size: 5.5px;
          color: #333;
        }
        .footer-note {
          text-align: left;
          font-size: 5.5px;
          margin-top: 1px;
          padding-top: 1px;
          border-top: 1px dotted #ccc;
          font-style: italic;
          margin-bottom: 0;
          padding-bottom: 0;
          line-height: 1.1;
        }

        /* --- Styles d'impression : 4 reçus par page A4 paysage (2x2) --- */
        @media print {
          @page {
            size: A4 landscape;
            margin: 1mm; /* Marges très réduites (gauche, droite, haut, bas) */
          }
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .print-page {
            page-break-after: always;
            height: 100vh;
            width: 100vw;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin: 0;
            padding: 0;
          }
          .print-page:last-child {
            page-break-after: avoid;
          }
          .receipts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 0.5mm; /* Espace minimum */
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            padding: 0.5mm; /* Padding externe minimum */
          }
          .receipt {
            border: 0.5px solid #000;
            padding: 0.2mm 0.3mm; /* Padding interne très réduit */
            font-size: 16px; /* Base très grande */
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background: white;
          }
          .receipt-header {
            padding-bottom: 0.1mm;
            margin-bottom: 0.1mm;
          }
          .header-logo {
            height: 20px; /* Logos bien visibles */
          }
          .church-titles .church-line,
          .church-titles .sabbath-line,
          .church-titles .federation-line {
            font-size: 13px;
          }
          .rosia-number {
            font-size: 13px;
          }
          .title-box {
            padding: 0.1mm 0.3mm;
            margin-bottom: 0.1mm;
          }
          .receipt-title {
            font-size: 14px;
          }
          .verse {
            font-size: 10px;
          }
          .member-info {
            font-size: 13px;
            margin: 0.1mm 0;
          }
          .member-line {
            gap: 0.05rem;
          }
          .member-line .label {
            min-width: 20px;
          }
          .member-line .district-label {
            min-width: 12px;
          }
          .amount-row {
            font-size: 13px;
            margin: 0.1mm 0;
            padding-bottom: 0.1mm;
          }
          .receipt-table {
            font-size: 12px;
            margin: 0.1mm 0;
          }
          .receipt-table td {
            padding: 0.1mm 0.2mm;
            line-height: 1;
          }
          .receipt-table .title-cell,
          .receipt-table .category-cell {
            padding-left: 0.5px;
          }
          .receipt-table .amount-cell,
          .receipt-table .total-cell {
            padding-right: 0.5px;
          }
          .signature-placeholder {
            font-size: 10px;
          }
          .footer-note {
            font-size: 10px;
            margin-top: 0.1mm;
            padding-top: 0.1mm;
          }
          .receipt-body {
            flex: 1;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}