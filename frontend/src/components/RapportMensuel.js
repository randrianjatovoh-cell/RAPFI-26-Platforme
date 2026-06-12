// src/components/RapportMensuel.js
import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, formatNumber, nombreEnLettresCapitalized, escapeHtml, capitalizeFirstLetter } from '../services/helpers';

function numberToLetters(n) { return nombreEnLettresCapitalized(n); }

export default function RapportMensuel({ currentMonth, selectedEglise }) {
  const { user } = useUser();
  const [report, setReport] = useState(null);
  const [eglise, setEglise] = useState(selectedEglise || user?.eglise || '');
  const [federation, setFederation] = useState(user?.federation || '');
  const [saramPandefasana, setSaramPandefasana] = useState(0);
  const [dateVersementFME, setDateVersementFME] = useState("");
  const [rosiaNum, setRosiaNum] = useState("");
  const [bokyBe, setBokyBe] = useState("");
  const [rapano, setRapano] = useState("");
  const [tatitra, setTatitra] = useState("");
  const [dateFanamarihana, setDateFanamarihana] = useState("");
  const [caisseFME, setCaisseFME] = useState("");
  const [soraBolaDate, setSoraBolaDate] = useState("");
  const [soraBolaMontant, setSoraBolaMontant] = useState(0);
  const [soraBolaLettres, setSoraBolaLettres] = useState("");
  const [soraBolaSignataire, setSoraBolaSignataire] = useState("");
  const [checkBokyBe, setCheckBokyBe] = useState(false);
  const [checkRapano, setCheckRapano] = useState(false);
  const [checkTatitra, setCheckTatitra] = useState(false);
  const [remarkBokyBe, setRemarkBokyBe] = useState("");
  const [remarkRapano, setRemarkRapano] = useState("");
  const [remarkTatitra, setRemarkTatitra] = useState("");
  const [chequeLines, setChequeLines] = useState(["","","","",""]);
  const [soraBolaLines, setSoraBolaLines] = useState(["","","","",""]);
  const [totalChequeSora, setTotalChequeSora] = useState(0);
  const [totalsBySabbathA, setTotalsBySabbathA] = useState([0,0,0,0,0]);
  const [totalsBySabbathB, setTotalsBySabbathB] = useState([0,0,0,0,0]);
  const [totalA, setTotalA] = useState(0);
  const [totalB, setTotalB] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [expensesBySabbath, setExpensesBySabbath] = useState([0,0,0,0,0]);
  const [balanceChurch, setBalanceChurch] = useState(0);
  const [sabbathDates, setSabbathDates] = useState(["","","","",""]);
  const [volaSisaTeoAloha, setVolaSisaTeoAloha] = useState(0);
  const [categorySums, setCategorySums] = useState(Array(8).fill().map(()=>[0,0,0,0,0]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEglise(selectedEglise || user?.eglise || '');
    setFederation(user?.federation || '');
  }, [selectedEglise, user]);

  useEffect(() => {
    if (currentMonth && eglise) loadData();
  }, [currentMonth, eglise]);

  async function loadData() {
    setLoading(true);
    try {
      const r = await api.getMonthlyReport(currentMonth, eglise);
      setReport(r);
      if (r) {
        setSabbathDates(r.sabbathDates || ["","","","",""]);
        setDateVersementFME(r.dateVersementFME || "");
        setRosiaNum(r.rosiaNum || "");
        setBokyBe(r.bokyBe || "");
        setRapano(r.rapano || "");
        setTatitra(r.tatitra || "");
        setDateFanamarihana(r.dateFanamarihana || "");
        setCaisseFME(r.caisseFME || "");
        setSoraBolaDate(r.soraBolaDate || "");
        setSoraBolaMontant(r.soraBolaMontant || 0);
        setSoraBolaLettres(r.soraBolaLettres || "");
        setSoraBolaSignataire(r.soraBolaSignataire || "");
        if (r.soraBolaLinesJson) {
          try { setSoraBolaLines(JSON.parse(r.soraBolaLinesJson)); } catch(e) {}
        }
      }
      const fraisVal = await api.getFrais(currentMonth, eglise);
      setSaramPandefasana(fraisVal);
      const glData = await api.getGL(currentMonth) || {};
      const perSabbathA = [0,0,0,0,0];
      const perSabbathB = [0,0,0,0,0];
      const categorySumsArr = Array(8).fill().map(()=>[0,0,0,0,0]);
      for (let s=1; s<=5; s++) {
        const entries = glData[s] || [];
        for (const entry of entries) {
          perSabbathA[s-1] += (entry.f1||0)+(entry.f2||0)+(entry.f3||0)+(entry.f4||0)+(entry.f5||0)+(entry.f6||0)+(entry.f7||0)+(entry.f8||0);
          perSabbathB[s-1] += (entry.b9||0)+(entry.b10||0);
          categorySumsArr[0][s-1] += entry.f1||0;
          categorySumsArr[1][s-1] += entry.f2||0;
          categorySumsArr[2][s-1] += entry.f3||0;
          categorySumsArr[3][s-1] += entry.f4||0;
          categorySumsArr[4][s-1] += entry.f5||0;
          categorySumsArr[5][s-1] += entry.f6||0;
          categorySumsArr[6][s-1] += entry.f7||0;
          categorySumsArr[7][s-1] += entry.f8||0;
        }
      }
      setTotalsBySabbathA(perSabbathA);
      setTotalsBySabbathB(perSabbathB);
      setTotalA(perSabbathA.reduce((a,b)=>a+b,0));
      setTotalB(perSabbathB.reduce((a,b)=>a+b,0));
      setCategorySums(categorySumsArr);
      const expensesList = await api.getDepenses(currentMonth);
      const totalExp = expensesList.reduce((s,e)=>s+(Number(e.amount)||0),0);
      setTotalExpenses(totalExp);
      const expensesByWeek = [0,0,0,0,0];
      if (sabbathDates[0]) {
        for (let exp of expensesList) {
          if (!exp.date) continue;
          const expDate = new Date(exp.date);
          if (isNaN(expDate)) continue;
          let found = -1;
          for (let i=0;i<sabbathDates.length;i++) {
            const sabDate = new Date(sabbathDates[i]);
            if (isNaN(sabDate)) continue;
            const startOfWeek = new Date(sabDate); startOfWeek.setDate(sabDate.getDate()-6);
            const endOfWeek = new Date(sabDate);
            if (expDate >= startOfWeek && expDate <= endOfWeek) { found=i; break; }
          }
          if (found!==-1) expensesByWeek[found] += Number(exp.amount)||0;
        }
      } else { expensesByWeek[0] = totalExp; }
      setExpensesBySabbath(expensesByWeek);
      const saved = localStorage.getItem(`volaSisaTeoAloha_${currentMonth}_${eglise}`);
      const sisa = saved ? parseFloat(saved) : 0;
      setVolaSisaTeoAloha(sisa);
      setBalanceChurch(sisa + totalB - totalExp);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  }

  const updateSoraBolaLine = (idx, rawValue) => {
    const numericValue = rawValue.replace(/[^\d.-]/g, '');
    const num = parseFloat(numericValue);
    const newValue = isNaN(num) ? '' : num.toString();
    const newLines = [...soraBolaLines];
    newLines[idx] = newValue;
    setSoraBolaLines(newLines);
    api.updateReportField(currentMonth, eglise, 'soraBolaLinesJson', JSON.stringify(newLines));
    const sum = newLines.reduce((acc,val)=>acc+(parseFloat(val)||0),0);
    setTotalChequeSora(sum);
  };

  const handleMontantChange = (val) => {
    const num = parseFloat(val)||0;
    setSoraBolaMontant(num);
    const lettres = numberToLetters(num);
    setSoraBolaLettres(lettres);
    api.updateReportField(currentMonth, eglise, 'soraBolaMontant', num);
    api.updateReportField(currentMonth, eglise, 'soraBolaLettres', lettres);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date)) return "";
    return `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear().toString().slice(-2)}`;
  };

  if (!currentMonth) return <div className="text-center p-4">Sélectionnez un mois.</div>;
  if (!eglise) return <div className="text-center p-4">Aucune église sélectionnée.</div>;
  if (loading) return <div className="text-center p-4">Chargement...</div>;

  const categories = ["Ampahafolony","Sekoly Sabata/S. faha-13","Fanambinana","Tsingerin-taona","Fanompoam-pivavahana","Federasiona","Maneran-tany","Manokana","…...............................","…..............................."];
  const totalNetFederation = totalA - saramPandefasana;
  const displayFederation = (federation || '').toUpperCase();

  return (
    <div className="rapport-mensuel" style={{maxWidth:'100%',margin:'0 auto',padding:'0 4px',fontSize:'11pt'}}>
      <style>{`@media print{@page{size:A4 portrait;margin:0.5cm 0.3cm}body,.rapport-mensuel{font-size:8pt!important}.no-print{display:none!important}.border,.border-black{border-color:#000!important;border-width:0.5pt!important}th,td{padding:2px!important}input{border:none!important;background:transparent!important}}`}</style>
      <div className="relative mb-1 flex items-start justify-between" style={{marginBottom:'4px'}}><div className="w-12 h-12" style={{width:'50px',height:'50px'}}><img src="/SDA-Logos.png" alt="SDA Logos" className="max-h-full max-w-full" onError={(e)=>e.target.style.display='none'}/></div><div className="flex-1 text-center">{displayFederation && <div className="font-bold uppercase" style={{fontSize:'12pt',marginBottom:'2px'}}>{displayFederation}</div>}<div className="font-bold" style={{fontSize:'13pt'}}>RAPAOROM-BOLAN'NY FIANGONANA</div><div className="italic" style={{fontSize:'9pt'}}>"IZAY OLONA MAHATOKY TOKOA DIA HO BE FITAHIANA" (Ohab. 28:20a)</div></div><button onClick={()=>window.print()} className="bg-gray-600 text-white px-3 py-1 rounded text-sm no-print">Imprimer</button></div>
      <div style={{height:'12px'}}></div>
      <div style={{fontSize:'10pt'}} className="mb-2"><div className="flex justify-between"><div><strong>FIANGONANA:</strong> {eglise}</div><div style={{textAlign:'center'}}><strong>Code:</strong> {report?.code||''}</div><div><strong>Volana:</strong> {formatMonthYear(currentMonth).split(' ')[0]}</div></div><div className="flex justify-between mt-1"><div><strong>DISTRIKA:</strong> {user?.district||'ANTSAHATANTERAKA'}</div><div><strong>Taona:</strong> {currentMonth.split('-')[0]}</div></div></div>
      <h3 className="font-bold mt-1">I- MOMBA NY VOLA HAROTSAKA ANY AMIN'NY FEDERASIONA</h3>
      <div className="overflow-x-auto"><table className="w-full border-collapse border border-black"><thead className="bg-gray-100"><tr><th className="border border-black p-1">DATY</th><th className="border border-black p-1">Sabata 1<br/>({formatDate(sabbathDates[0])})</th><th className="border border-black p-1">Sabata 2<br/>({formatDate(sabbathDates[1])})</th><th className="border border-black p-1">Sabata 3<br/>({formatDate(sabbathDates[2])})</th><th className="border border-black p-1">Sabata 4<br/>({formatDate(sabbathDates[3])})</th><th className="border border-black p-1">Sabata 5<br/>({formatDate(sabbathDates[4])})</th><th className="border border-black p-1">TONTALINY</th><th className="border border-black p-1">RAPAORO</th></tr></thead><tbody>
        {categories.map((cat,idx)=>{
          if(idx>=categories.length-2) return <tr key={cat}><td className="border border-black p-1 font-bold">{cat}</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td><td className="border p-1 text-right">-</td></tr>;
          const sabVals = categorySums[idx]||[0,0,0,0,0];
          const total = sabVals.reduce((a,b)=>a+b,0);
          if(idx===1){
            let sumRapaoro=0;
            for(let i=1;i<=4;i++) sumRapaoro += (categorySums[i]||[0,0,0,0,0]).reduce((a,b)=>a+b,0);
            return <tr key={cat}><td className="border p-1 font-bold">{cat}</td>{sabVals.map((v,i)=><td key={i} className="border p-1 text-right">{formatNumber(v)}</td>)}<td className="border p-1 text-right font-bold">{formatNumber(total)}</td><td rowSpan="4" className="border p-1 text-right align-middle font-bold">{formatNumber(sumRapaoro)}</td></tr>;
          } else if(idx>=2 && idx<=4){
            return <tr key={cat}><td className="border p-1 font-bold">{cat}</td>{sabVals.map((v,i)=><td key={i} className="border p-1 text-right">{formatNumber(v)}</td>)}<td className="border p-1 text-right font-bold">{formatNumber(total)}</td></tr>;
          } else {
            return <tr key={cat}><td className="border p-1 font-bold">{cat}</td>{sabVals.map((v,i)=><td key={i} className="border p-1 text-right">{formatNumber(v)}</td>)}<td className="border p-1 text-right font-bold">{formatNumber(total)}</td><td className="border p-1 text-right">{formatNumber(total)}</td></tr>;
          }
        })}
      </tbody><tfoot><tr className="font-bold bg-gray-50"><td className="border p-1">TONTALIN'NY VOLA MIAKATRA any @ FME</td>{totalsBySabbathA.map((s,i)=><td key={i} className="border p-1 text-right">{formatNumber(s)}</td>)}<td className="border p-1 text-right">{formatNumber(totalA)}</td><td className="border p-1 text-right">{formatNumber(totalA)}</td></tr></tfoot></table></div>
      <div className="inline-row mt-1" style={{justifyContent:'space-between'}}><div><span className="font-bold">Daty nandrotsahana ny vola any amin'ny foibe FME :</span> <input type="date" value={dateVersementFME} onChange={e=>{setDateVersementFME(e.target.value); api.updateReportField(currentMonth,eglise,'dateVersementFME',e.target.value);}} className="rounded p-0.5" style={{width:'130px'}} /></div><div><span className="font-bold">SARAM-PANDEFASANA (Ar) :</span> <input type="number" value={saramPandefasana} readOnly className="rounded p-0.5 text-right bg-gray-100" style={{width:'100px'}} /></div></div>
      <div className="text-right mt-1">TONTALIN'NY VOLA MIAKATRA any @ FME : <span className="inline-block border border-gray-800 bg-gray-100 px-2 py-0.5 rounded font-bold ml-1">{formatNumber(totalNetFederation)} Ar</span></div>
      <div className="grid grid-cols-2 gap-1 mt-1"><div className="border p-1"><div className="font-bold mb-1">FANAMARIHANA ATAON'NY MPANAMARIM-BOKY</div><div><div><input type="checkbox" checked={checkBokyBe} onChange={e=>setCheckBokyBe(e.target.checked)}/><span className="label ml-1">Boky Be :</span><input type="text" value={remarkBokyBe} onChange={e=>setRemarkBokyBe(e.target.value)} className="rounded p-0.5 ml-1"/></div><div><input type="checkbox" checked={checkRapano} onChange={e=>setCheckRapano(e.target.checked)}/><span className="label ml-1">Rapaoro :</span><input type="text" value={remarkRapano} onChange={e=>setRemarkRapano(e.target.value)} className="rounded p-0.5 ml-1"/></div><div><input type="checkbox" checked={checkTatitra} onChange={e=>setCheckTatitra(e.target.checked)}/><span className="label ml-1">Tatitra :</span><input type="text" value={remarkTatitra} onChange={e=>setRemarkTatitra(e.target.value)} className="rounded p-0.5 ml-1"/></div></div></div><div className="border p-1"><div><span className="font-semibold">Rosia N° :</span> <input type="text" value={rosiaNum} onChange={e=>{setRosiaNum(e.target.value); api.updateReportField(currentMonth,eglise,'rosiaNum',e.target.value);}} className="rounded p-0.5" style={{width:'160px'}} /></div><div><span className="font-semibold">Daty :</span> <input type="date" value={dateFanamarihana} onChange={e=>{setDateFanamarihana(e.target.value); api.updateReportField(currentMonth,eglise,'dateFanamarihana',e.target.value);}} className="rounded p-0.5" style={{width:'130px'}} /></div><div><span className="font-semibold">Anarana sy Sonian'ny CAISSE-FME :</span> <input type="text" value={caisseFME} onChange={e=>{setCaisseFME(e.target.value); api.updateReportField(currentMonth,eglise,'caisseFME',e.target.value);}} className="rounded p-0.5 w-full" /></div></div></div>
      <div className="grid grid-cols-2 gap-1 mt-1"><div className="border p-1"><div className="font-bold italic text-center">"Faritra tsy maintsy fenoina eto raha ny pasitora no nandray ny vola"</div><div><span className="font-semibold">Voaray androany (daty) :</span> <input type="date" value={soraBolaDate} onChange={e=>{setSoraBolaDate(e.target.value); api.updateReportField(currentMonth,eglise,'soraBolaDate',e.target.value);}} className="rounded p-0.5" /></div><div><span className="font-semibold">Ny vola Ar :</span> <input type="number" value={soraBolaMontant} onChange={e=>handleMontantChange(e.target.value)} className="rounded text-right p-0.5" step="any" /></div><div><span className="font-semibold">An-tsoratra :</span> <input type="text" value={soraBolaLettres} readOnly style={{backgroundColor:'#f9f9f9'}} className="rounded p-0.5" /></div><div><span className="font-semibold">Anarana sy sonian'ny nandray vola :</span> <input type="text" value={soraBolaSignataire} onChange={e=>{setSoraBolaSignataire(e.target.value); api.updateReportField(currentMonth,eglise,'soraBolaSignataire',e.target.value);}} className="rounded p-0.5 w-full" /></div></div><div className="border p-1"><table className="w-full border-collapse"><thead><tr><th className="border border-black p-0.5">CHEQUE/BANQUE</th><th className="border border-black p-0.5">SORA-BOLA</th></tr></thead><tbody>{[...Array(5)].map((_,idx)=><tr key={idx}><td className="border border-black p-0"><input type="text" value={chequeLines[idx]} onChange={e=>{const newL=[...chequeLines]; newL[idx]=e.target.value; setChequeLines(newL);}} className="w-full p-0.5 border-none" /></td><td className="border border-black p-0 sora-bola-col"><input type="text" value={formatNumber(soraBolaLines[idx])} onChange={e=>updateSoraBolaLine(idx,e.target.value)} className="w-full p-0.5 border-none" style={{textAlign:'right'}}/></td></tr>)}<tr className="font-bold bg-gray-100"><td className="border border-black p-0.5 text-right">TOTAL :</td><td className="border border-black p-0.5 text-right">{formatNumber(totalChequeSora)} Ar</td></tr></tbody></table></div></div>
      <h3 className="font-bold mt-2">II- MOMBA NY VOLAM-PIANGONANA ETO AN-TOERANA</h3>
      <div className="overflow-x-auto mt-0"><table className="w-full border-collapse border border-black"><thead><tr><th className="border border-black p-0.5">ANTONY</th><th className="border border-black p-0.5">Sabata 1 ({formatDate(sabbathDates[0])})</th><th className="border border-black p-0.5">Sabata 2 ({formatDate(sabbathDates[1])})</th><th className="border border-black p-0.5">Sabata 3 ({formatDate(sabbathDates[2])})</th><th className="border border-black p-0.5">Sabata 4 ({formatDate(sabbathDates[3])})</th><th className="border border-black p-0.5">Sabata 5 ({formatDate(sabbathDates[4])})</th><th className="border border-black p-0.5">TONTALINY</th></tr></thead><tbody>
        <tr><td className="border p-0.5 font-bold">VOLA SISA tamin'ny volana teo aloha:</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right">{formatNumber(volaSisaTeoAloha)} Ar</td></tr>
        <tr><td className="border p-0.5 font-bold">VOLA NIDITRA nandritra ny volana:</td>{totalsBySabbathB.map((s,i)=><td key={i} className="border p-0.5 text-right">{formatNumber(s)} Ar</td>)}<td className="border p-0.5 text-right">{formatNumber(totalB)} Ar</td></tr>
        <tr><td className="border p-0.5 font-bold">VOLA NIVOAKA nandritra ny volana:</td>{expensesBySabbath.map((s,i)=><td key={i} className="border p-0.5 text-right">{formatNumber(s)} Ar</td>)}<td className="border p-0.5 text-right">{formatNumber(totalExpenses)} Ar</td></tr>
        <tr><td className="border p-0.5 font-bold">VOLA SISA tamin'ny faran'ny volana:</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right protected-cell">-</td><td className="border p-0.5 text-right">{formatNumber(balanceChurch)} Ar</td></tr>
      </tbody></table></div>
      <div className="grid grid-cols-3 gap-2 mt-1 border-t pt-1" style={{gap:'8px',fontSize:'10pt'}}><div><div className="font-bold">Ny Mpitahiry vola</div><div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div></div><div><div className="font-bold">Ny Mpitahiry vola Mpanampy</div><div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div></div><div><div className="font-bold">Ny Loholona na ny Tale</div><div>Anarana: ________</div><div>Adiresy: ________</div><div>Tel: ________</div><div>(sonia)</div></div></div>
    </div>
  );
}