// src/components/Formulaire.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';
import { formatMonthYear, capitalizeFirstLetter, formatNumber } from '../services/helpers';
import { useReceipts } from '../context/ReceiptsContext';

export default function Formulaire({
  user: propUser,
  currentMonth,
  setCurrentMonth,
  months,
  setMonths,
  refreshAll,
  onDataSaved,
  selectedSabbath,
  onSabbathChange,
  selectedEglise,
  onEgliseChange,
  selectedDistrict,
  onDistrictChange,
  selectedFederation,
  onFederationChange,
  readOnly = false,
  onOpenReceipts = null
}) {
  const { user: contextUser } = useUser();
  const { canViewEglise, canEditEglise, isReadOnly: isGlobalReadOnly } = usePermissions();
  const user = propUser || contextUser;
  const { updateReceipts } = useReceipts();

  const [churchConfig, setChurchConfig] = useState({ district: "ANTSAHATANTERAKA", church: "", code: "" });
  const [sabbathIndex, setSabbathIndex] = useState(selectedSabbath || '');
  const [sabbathDate, setSabbathDate] = useState("");
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
  const [loading, setLoading] = useState(false);
  const [loadingDate, setLoadingDate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eglises, setEglises] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [federations, setFederations] = useState([]);
  const [lockedRows, setLockedRows] = useState([]);
  const [hasData, setHasData] = useState(false);
  
  // 🔥 État pour le modal Billetage
  const [showBilletage, setShowBilletage] = useState(false);
  const [billetageData, setBilletageData] = useState({
    fanatitraTotal: 0,
    fanatitraBillets: { 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0 },
    resteTotal: 0,
    resteBillets: { 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0 }
  });

  const isAdmin = user?.fonction === 'Admin';
  const isPasteur = user?.fonction === 'Pasteur';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isTresorier = user?.fonction === 'Trésorier';
  const isAncien = user?.fonction === 'Ancien';
  const canAddMonth = (isAdmin || isPasteur || isTresorier || isAncien) && !readOnly && !isGlobalReadOnly();
  const hasFixedChurch = !isPasteur && !isVerificateur && !isAdmin;

  const lockEntries = (isPasteur && hasData) || readOnly;

  const isSelectorDisabled = isGlobalReadOnly() || 
    (!isAdmin && selectedEglise && !canEditEglise(selectedEglise, user?.district, user?.federation));

  const loadingRef = useRef(false);
  const currentKeyRef = useRef('');

  // Valeurs des billets
  const BILLET_VALUES = [20000, 10000, 5000, 2000, 1000, 500, 200, 100];
  const BILLET_LABELS = ['20 000', '10 000', '5 000', '2 000', '1 000', '500', '200', '100'];

  // ===== CHARGEMENT DES LISTES =====
  useEffect(() => {
    if (isAdmin) {
      api.getAllUsers().then(users => {
        const feds = [...new Set(users.map(u => u.federation).filter(f => f))];
        setFederations(feds);
        if (feds.length > 0 && !selectedFederation && typeof onFederationChange === 'function') {
          onFederationChange(feds[0]);
        }
      });
    } else if (user?.federation) {
      setFederations([user.federation]);
      if (!selectedFederation && typeof onFederationChange === 'function') {
        onFederationChange(user.federation);
      }
    }
  }, [isAdmin, user, selectedFederation, onFederationChange]);

  useEffect(() => {
    if (isAdmin && selectedFederation) {
      api.getAllUsers().then(users => {
        const dists = [...new Set(users.filter(u => u.federation === selectedFederation && u.district).map(u => u.district))];
        setDistricts(dists);
        if (dists.length > 0 && !selectedDistrict && typeof onDistrictChange === 'function') {
          onDistrictChange(dists[0]);
        }
      });
    } else if (isPasteur && user?.district) {
      setDistricts([user.district]);
      if (!selectedDistrict && typeof onDistrictChange === 'function') {
        onDistrictChange(user.district);
      }
    } else if (isVerificateur && user?.district) {
      setDistricts([user.district]);
      if (!selectedDistrict && typeof onDistrictChange === 'function') {
        onDistrictChange(user.district);
      }
    }
  }, [isAdmin, selectedFederation, user, selectedDistrict, onDistrictChange]);

  useEffect(() => {
    const loadEglises = async () => {
      try {
        let eglisesList = [];
        if (isAdmin && selectedDistrict) {
          eglisesList = await api.getEglisesByDistrict(selectedDistrict);
        } else if (isPasteur && user?.district) {
          eglisesList = await api.getEglisesByDistrict(user.district);
        } else if (isVerificateur && user?.federation) {
          eglisesList = await api.getEglisesByFederation(user.federation);
        } else if (isAncien || isTresorier) {
          if (user?.eglise) eglisesList = [user.eglise];
        }
        setEglises(eglisesList);
        if (eglisesList.length > 0 && !selectedEglise && typeof onEgliseChange === 'function') {
          onEgliseChange(eglisesList[0]);
        }
      } catch (err) {
        console.warn('Erreur chargement églises :', err);
      }
    };
    loadEglises();
  }, [isAdmin, isPasteur, isVerificateur, isAncien, isTresorier, selectedDistrict, user, selectedEglise, onEgliseChange]);

  // ==== Gestion des lignes verrouillées ====
  useEffect(() => {
    if (entries.length !== lockedRows.length) {
      setLockedRows(prev => {
        if (entries.length > prev.length) return [...prev, ...Array(entries.length - prev.length).fill(false)];
        else return prev.slice(0, entries.length);
      });
    }
  }, [entries, lockedRows.length]);

  useEffect(() => {
    api.getChurchConfig().then(config => setChurchConfig(config || { district: "ANTSAHATANTERAKA", church: "", code: "" }));
  }, []);

  useEffect(() => {
    if (onSabbathChange && sabbathIndex) onSabbathChange(parseInt(sabbathIndex));
    else if (onSabbathChange && !sabbathIndex) onSabbathChange(null);
  }, [sabbathIndex, onSabbathChange]);

  useEffect(() => {
    async function loadMonths() {
      try {
        const mois = await api.getMonths();
        if (setMonths) setMonths(mois);
        if (mois.length > 0 && !currentMonth && setCurrentMonth) setCurrentMonth(mois[0].id);
      } catch (err) {
        if (err.message === "SESSION_EXPIRED") {
          console.warn("Session expirée, redirection en cours...");
        } else {
          console.error("Erreur chargement des mois :", err);
        }
      }
    }
    loadMonths();
  }, [setMonths, setCurrentMonth, currentMonth]);

  const refreshMonths = async () => {
    try {
      const mois = await api.getMonths();
      if (setMonths) setMonths(mois);
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") {
        console.warn("Session expirée lors du refresh");
      } else {
        console.error("Erreur refreshMonths :", err);
      }
    }
  };

  const loadSabbathDate = useCallback(async () => {
    if (!currentMonth || !selectedEglise || !sabbathIndex) return;
    const key = `${currentMonth}-${selectedEglise}-${sabbathIndex}`;
    if (currentKeyRef.current === key || loadingRef.current) return;
    loadingRef.current = true;
    setLoadingDate(true);
    try {
      const report = await api.getMonthlyReport(currentMonth, selectedEglise);
      const index = parseInt(sabbathIndex) - 1;
      let dateValue = "";
      if (report && report.sabbath_dates) {
        try {
          const dates = JSON.parse(report.sabbath_dates);
          if (dates && dates[index]) dateValue = dates[index];
        } catch (e) { console.warn("Erreur parsing sabbath_dates", e); }
      }
      setSabbathDate(dateValue);
      currentKeyRef.current = key;
    } catch (err) {
      console.error("Erreur chargement date:", err);
    } finally {
      setLoadingDate(false);
      loadingRef.current = false;
    }
  }, [currentMonth, selectedEglise, sabbathIndex]);

  const loadEntries = useCallback(async () => {
    if (!currentMonth || !selectedEglise || !sabbathIndex) {
      setEntries([]);
      setLockedRows([]);
      setTotals({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
      setHasData(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const glData = await api.getGL(currentMonth, null, null, selectedEglise);
      const sabbathNum = parseInt(sabbathIndex);
      const data = glData && glData[sabbathNum] ? glData[sabbathNum] : [];
      if (data.length === 0) {
        setEntries([createEmptyEntry()]);
        setLockedRows([false]);
        setHasData(false);
      } else {
        setEntries(data);
        setLockedRows(data.map(() => true));
        setHasData(true);
      }
      computeTotals(data);
    } catch (err) { 
      console.error(err);
      setEntries([createEmptyEntry()]);
      setLockedRows([false]);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedEglise, sabbathIndex]);

  useEffect(() => {
    if (currentMonth && selectedEglise && sabbathIndex) {
      loadEntries();
      loadSabbathDate();
    } else {
      setEntries([]);
      setLockedRows([]);
      setTotals({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
      setHasData(false);
    }
  }, [currentMonth, sabbathIndex, selectedEglise, loadEntries, loadSabbathDate]);

  function createEmptyEntry() {
    return { id: Date.now() + Math.random() * 10000, memberName: "", rosia: "", f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, b9: 0, b10: 0 };
  }

  function computeTotals(entriesList) {
    const newTotals = { f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 };
    for (let e of entriesList) {
      newTotals.f1 += e.f1 || 0; newTotals.f2 += e.f2 || 0; newTotals.f3 += e.f3 || 0;
      newTotals.f4 += e.f4 || 0; newTotals.f5 += e.f5 || 0; newTotals.f6 += e.f6 || 0;
      newTotals.f7 += e.f7 || 0; newTotals.f8 += e.f8 || 0;
      newTotals.b9 += e.b9 || 0; newTotals.b10 += e.b10 || 0;
    }
    setTotals(newTotals);
  }

  function addRow() {
    if (isSaving || isGlobalReadOnly() || lockEntries) return;
    setLockedRows(prev => [...prev.map(() => true), false]);
    setEntries(prev => [...prev, createEmptyEntry()]);
  }

  function removeRow(id) {
    if (isSaving || isGlobalReadOnly() || lockEntries) return;
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) return;
    const newEntries = entries.filter(e => e.id !== id);
    const newLocked = lockedRows.filter((_, i) => i !== index);
    setEntries(newEntries);
    setLockedRows(newLocked);
    computeTotals(newEntries);
  }

  function unlockRow(index) {
    if (isSaving || isGlobalReadOnly() || lockEntries) return;
    setLockedRows(prev => prev.map((locked, i) => i === index ? false : locked));
  }

  function updateEntry(id, field, value) {
    if (isSaving || isGlobalReadOnly() || lockEntries) return;
    const index = entries.findIndex(e => e.id === id);
    if (index === -1 || lockedRows[index]) return;
    const newEntries = entries.map(e => e.id === id ? { ...e, [field]: value } : e);
    setEntries(newEntries);
    computeTotals(newEntries);
  }

  function normalizeEntry(entry) {
    return { ...entry, f1: Number(entry.f1)||0, f2: Number(entry.f2)||0, f3: Number(entry.f3)||0, f4: Number(entry.f4)||0, f5: Number(entry.f5)||0, f6: Number(entry.f6)||0, f7: Number(entry.f7)||0, f8: Number(entry.f8)||0, b9: Number(entry.b9)||0, b10: Number(entry.b10)||0 };
  }

  // ============================================================
  // 🔥 FONCTIONS POUR LE BILLETAGE
  // ============================================================
  
  const openBilletage = () => {
    // Calculer les totaux des fanatitra (f2 à f8) et des restes (b9 + b10)
    let fanatitraTotal = 0;
    let resteTotal = 0;
    
    for (const entry of entries) {
      fanatitraTotal += (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) + 
                        (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
      resteTotal += (entry.b9 || 0) + (entry.b10 || 0);
    }
    
    // Initialiser les compteurs de billets à 0
    const emptyBillets = { 20000: 0, 10000: 0, 5000: 0, 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0 };
    
    setBilletageData({
      fanatitraTotal,
      fanatitraBillets: { ...emptyBillets },
      resteTotal,
      resteBillets: { ...emptyBillets }
    });
    
    setShowBilletage(true);
  };

  const closeBilletage = () => {
    setShowBilletage(false);
  };

  // Mettre à jour le nombre de billets pour Fanatitra
  const updateFanatitraBillet = (valeur, count) => {
    const num = parseInt(count) || 0;
    setBilletageData(prev => ({
      ...prev,
      fanatitraBillets: { ...prev.fanatitraBillets, [valeur]: num }
    }));
  };

  // Mettre à jour le nombre de billets pour Reste
  const updateResteBillet = (valeur, count) => {
    const num = parseInt(count) || 0;
    setBilletageData(prev => ({
      ...prev,
      resteBillets: { ...prev.resteBillets, [valeur]: num }
    }));
  };

  // Calculer le total des billets pour une catégorie
  const calculateBilletTotal = (billets) => {
    let total = 0;
    for (const [valeur, count] of Object.entries(billets)) {
      total += parseInt(valeur) * count;
    }
    return total;
  };

  // ===== SAUVEGARDE =====
  async function handleSave() {
    if (isSaving || isGlobalReadOnly() || lockEntries) return;
    if (!currentMonth) return alert("Sélectionnez un mois.");
    if (!sabbathIndex) return alert("Sélectionnez un Sabata.");
    if (!sabbathDate) return alert("Renseignez la date du Sabata.");
    if (!selectedEglise) return alert("Sélectionnez une église.");
    if (entries.length === 0) return alert("Aucune ligne à sauvegarder.");

    if (!isAdmin && !canEditEglise(selectedEglise, user?.district, user?.federation)) {
      alert("Vous n'avez pas les droits pour modifier cette église.");
      return;
    }

    setIsSaving(true);
    try {
      await api.saveChurchConfig(churchConfig);

      let glData = await api.getGL(currentMonth, null, null, selectedEglise) || {};
      const sabbathNum = parseInt(sabbathIndex);
      glData[sabbathNum] = entries.map(e => ({ ...normalizeEntry(e), monthId: currentMonth, sabbathIndex: sabbathNum, eglise: selectedEglise }));

      const payload = {
        month: currentMonth,
        data: glData,
        eglise: selectedEglise,
      };

      if (isAdmin) {
        payload.district = selectedDistrict;
        payload.federation = selectedFederation;
      } else {
        payload.district = user.district;
        payload.federation = user.federation;
      }

      await api.saveGL(payload);
      await api.updateSabbathDate(currentMonth, selectedEglise, sabbathNum, sabbathDate);

      alert(`Sabata ${sabbathIndex} sauvegardé pour ${selectedEglise}!`);
      window.dispatchEvent(new Event('data-updated'));
      if (refreshAll) await refreshAll();
      if (onDataSaved) onDataSaved();
      setLockedRows(entries.map(() => true));
      setHasData(true);

      await loadEntries();
    } catch (err) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteMonth() {
    if (isGlobalReadOnly() || lockEntries) {
      alert("Vous n'avez pas les droits pour supprimer des données.");
      return;
    }
    if (!currentMonth || !selectedEglise) {
      alert("Sélectionnez un mois et une église.");
      return;
    }

    if (!isAdmin && !canEditEglise(selectedEglise, user?.district, user?.federation)) {
      alert("Vous n'avez pas les droits pour supprimer les données de cette église.");
      return;
    }

    if (!window.confirm(`⚠️ Supprimer TOUTES les données du mois ${formatMonthYear(currentMonth)} pour l'église ${selectedEglise} ?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.deleteMonthData(currentMonth, selectedEglise);
      alert(`Toutes les données du mois ${formatMonthYear(currentMonth)} ont été supprimées.`);
      setEntries([]);
      setLockedRows([]);
      setSabbathDate("");
      setTotals({ f1:0,f2:0,f3:0,f4:0,f5:0,f6:0,f7:0,f8:0,b9:0,b10:0 });
      setSabbathIndex('');
      setHasData(false);
      if (onSabbathChange) onSabbathChange(null);
      window.dispatchEvent(new Event('data-updated'));
      if (refreshAll) await refreshAll();
    } catch (err) {
      console.error(err);
      let msg = err.message || 'Erreur inconnue';
      if (msg.includes('403') || msg.includes('Accès refusé')) {
        msg = "Vous n'avez pas l'autorisation de supprimer les données de cette église. Contactez un administrateur.";
      } else if (msg.includes('SESSION_EXPIRED')) {
        msg = "Votre session a expiré. Veuillez vous reconnecter.";
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = "Impossible de contacter le serveur. Vérifiez votre connexion.";
      }
      alert(`Erreur : ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  }

  const handleSabbathDateChange = (e) => {
    setSabbathDate(e.target.value);
  };

  const goToPreviousMonth = () => {
    if (!months || months.length === 0) return;
    const idx = months.findIndex(m => m.id === currentMonth);
    if (idx > 0) setCurrentMonth(months[idx-1].id);
  };
  const goToNextMonth = () => {
    if (!months || months.length === 0) return;
    const idx = months.findIndex(m => m.id === currentMonth);
    if (idx < months.length-1) setCurrentMonth(months[idx+1].id);
  };
  const handleMonthChange = (e) => setCurrentMonth(e.target.value);

  const addNewMonth = async () => {
    if (!canAddMonth) return alert("Non autorisé.");
    const newMonthId = prompt("Nouveau mois (AAAA-MM) :");
    if (!newMonthId || !/^\d{4}-\d{2}$/.test(newMonthId)) return alert("Format invalide.");
    try {
      await api.addMonth(newMonthId);
      await refreshMonths();
      setCurrentMonth(newMonthId);
      alert(`Mois ${newMonthId} ajouté.`);
    } catch (err) {
      if (err.message.includes('exists')) alert("Ce mois existe déjà.");
      else alert(`Erreur : ${err.message}`);
    }
  };

  const totalAGeneral = totals.f1+totals.f2+totals.f3+totals.f4+totals.f5+totals.f6+totals.f7+totals.f8;
  const totalBGeneral = totals.b9+totals.b10;

  if (selectedEglise && !isAdmin && !canViewEglise(selectedEglise, user?.district, user?.federation)) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-lg">
        <i className="fas fa-lock text-red-500 text-4xl mb-4"></i>
        <p className="text-red-600 font-semibold">Accès non autorisé</p>
        <p className="text-gray-600 text-sm mt-2">Vous n'avez pas les droits pour accéder à cette église.</p>
      </div>
    );
  }

  const isInputDisabled = isSelectorDisabled || lockEntries;

  const handleOpenReceipts = () => {
    if (entries.length === 0) {
      alert("Aucune ligne à afficher en reçu.");
      return;
    }
    updateReceipts({
      entries,
      eglise: selectedEglise || user?.eglise || '',
      district: user?.district || '',
      federation: user?.federation || '',
      sabbathDate,
      monthId: currentMonth,
      sabbathIndex
    });
    if (onOpenReceipts) {
      onOpenReceipts();
    }
  };

  const showReceiptsButton = entries.length > 0;

  // ============================================================
  // 🔥 RENDU DU MODAL BILLETAGE - VERSION AMÉLIORÉE COMPLÈTE
  // ============================================================
  const renderBilletageModal = () => {
    if (!showBilletage) return null;

    // Calcul des totaux Fanatitra (f2 à f8) et Reste (b9 + b10)
    let fanatitraTotal = 0;
    let resteTotal = 0;
    let totalAGeneral = 0;
    let totalBGeneral = 0;
    
    for (const entry of entries) {
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
      
      fanatitraTotal += f2 + f3 + f4 + f5 + f6 + f7 + f8;
      resteTotal += b9 + b10;
      totalAGeneral += f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
      totalBGeneral += b9 + b10;
    }
    
    const totalAB = totalAGeneral + totalBGeneral;

    const fanatitraBilletTotal = calculateBilletTotal(billetageData.fanatitraBillets);
    const fanatitraBalance = fanatitraTotal - fanatitraBilletTotal;
    
    const resteBilletTotal = calculateBilletTotal(billetageData.resteBillets);
    const resteBalance = resteTotal - resteBilletTotal;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-4" style={{ maxHeight: '98vh' }}>
          
          {/* ============================================================
              EN-TÊTE AVEC TITRE CENTRÉ ET MONTANTS A+B
              ============================================================ */}
          <div className="text-center border-b pb-2 mb-3">
            <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wider">
              VERIFICATION BILLETAGE
            </h2>
            <div className="flex justify-center items-center gap-6 mt-1 text-sm">
              <span className="font-semibold text-blue-700">
                Total A : {formatNumber(totalAGeneral)} Ar
              </span>
              <span className="font-semibold text-green-700">
                Total B : {formatNumber(totalBGeneral)} Ar
              </span>
              <span className="font-semibold text-purple-700 bg-purple-50 px-3 py-0.5 rounded-full">
                A+B : {formatNumber(totalAB)} Ar
              </span>
            </div>
          </div>

          {/* ============================================================
              CONTENU - 2 COLONNES AVEC DONNÉES À CÔTÉ DES SOUS-TITRES
              ============================================================ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* ============================================================
                COLONNE FANATITRA (tsy Ambalopy)
                ============================================================ */}
            <div className="border rounded-lg p-3 bg-blue-50/50">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-base font-bold text-blue-700 flex items-center gap-2">
                  <i className="fas fa-hand-holding-heart"></i>
                  tsy Ambalopy
                </h3>
                <span className="text-sm font-bold text-blue-700 bg-white px-3 py-0.5 rounded-full shadow">
                  {formatNumber(fanatitraTotal)} Ar
                </span>
              </div>
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="p-1.5 text-left text-xs">Billet</th>
                    <th className="p-1.5 text-right text-xs">Qté</th>
                    <th className="p-1.5 text-right text-xs">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {BILLET_VALUES.map((valeur, idx) => {
                    const count = billetageData.fanatitraBillets[valeur] || 0;
                    const montant = valeur * count;
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-1.5 text-xs font-medium">{BILLET_LABELS[idx]} Ar</td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => updateFanatitraBillet(valeur, e.target.value)}
                            className="w-16 text-right border rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-blue-400"
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono text-xs">{formatNumber(montant)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-blue-100 font-bold text-xs">
                  <tr>
                    <td className="p-1.5">TOTAL</td>
                    <td className="p-1.5 text-right">-</td>
                    <td className="p-1.5 text-right text-blue-700">{formatNumber(fanatitraBilletTotal)} Ar</td>
                  </tr>
                  <tr className="bg-yellow-50">
                    <td className="p-1.5">BALANCE</td>
                    <td className="p-1.5 text-right">-</td>
                    <td className={`p-1.5 text-right font-bold ${fanatitraBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fanatitraBalance === 0 ? '✅ OK' : formatNumber(fanatitraBalance) + ' Ar'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ============================================================
                COLONNE RESTE (Ambalopy)
                ============================================================ */}
            <div className="border rounded-lg p-3 bg-green-50/50">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <h3 className="text-base font-bold text-green-700 flex items-center gap-2">
                  <i className="fas fa-coins"></i>
                  Ambalopy
                </h3>
                <span className="text-sm font-bold text-green-700 bg-white px-3 py-0.5 rounded-full shadow">
                  {formatNumber(resteTotal)} Ar
                </span>
              </div>
              
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-100">
                    <th className="p-1.5 text-left text-xs">Billet</th>
                    <th className="p-1.5 text-right text-xs">Qté</th>
                    <th className="p-1.5 text-right text-xs">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {BILLET_VALUES.map((valeur, idx) => {
                    const count = billetageData.resteBillets[valeur] || 0;
                    const montant = valeur * count;
                    return (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="p-1.5 text-xs font-medium">{BILLET_LABELS[idx]} Ar</td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => updateResteBillet(valeur, e.target.value)}
                            className="w-16 text-right border rounded px-1 py-0.5 text-xs focus:ring-2 focus:ring-green-400"
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono text-xs">{formatNumber(montant)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-green-100 font-bold text-xs">
                  <tr>
                    <td className="p-1.5">TOTAL</td>
                    <td className="p-1.5 text-right">-</td>
                    <td className="p-1.5 text-right text-green-700">{formatNumber(resteBilletTotal)} Ar</td>
                  </tr>
                  <tr className="bg-yellow-50">
                    <td className="p-1.5">BALANCE</td>
                    <td className="p-1.5 text-right">-</td>
                    <td className={`p-1.5 text-right font-bold ${resteBalance === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {resteBalance === 0 ? '✅ OK' : formatNumber(resteBalance) + ' Ar'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ============================================================
              PIED - BOUTON FERMER
              ============================================================ */}
          <div className="mt-3 flex justify-end border-t pt-2">
            <button
              onClick={closeBilletage}
              className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-1.5 rounded-lg text-sm transition"
            >
              <i className="fas fa-times mr-2"></i> Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {isAdmin && (
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-100 rounded">
          <div>
            <label className="block text-sm font-medium">Fédération</label>
            <select
              value={selectedFederation || ''}
              onChange={e => onFederationChange && onFederationChange(e.target.value)}
              className="border rounded px-2 py-1 bg-white"
              disabled={isSelectorDisabled}
            >
              <option value="">-- Sélectionner --</option>
              {federations.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">District</label>
            <select
              value={selectedDistrict || ''}
              onChange={e => onDistrictChange && onDistrictChange(e.target.value)}
              className="border rounded px-2 py-1 bg-white"
              disabled={isSelectorDisabled || !selectedFederation}
            >
              <option value="">-- Sélectionner --</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Église</label>
            <select
              value={selectedEglise || ''}
              onChange={e => onEgliseChange && onEgliseChange(e.target.value)}
              className="border rounded px-2 py-1 bg-white"
              disabled={isSelectorDisabled || !selectedDistrict}
            >
              <option value="">-- Sélectionner --</option>
              {eglises.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg no-print">
        <div className="flex flex-col">
          <div><strong>Fédération :</strong> {isAdmin ? (selectedFederation || 'Non sélectionnée') : (user?.federation || 'Non renseignée')}</div>
          <div className="mt-1"><strong>District :</strong> {isAdmin ? (selectedDistrict || 'Non sélectionné') : (user?.district || 'Non renseigné')}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Mois :</label>
          <select value={currentMonth || ''} onChange={handleMonthChange} className="border rounded px-2 py-1 bg-white" disabled={isSelectorDisabled}>
            {months && months.map(m => <option key={m.id} value={m.id}>{formatMonthYear(m.id)}</option>)}
          </select>
          <button onClick={goToPreviousMonth} className="bg-gray-500 text-white px-2 py-1 rounded text-sm" disabled={isSelectorDisabled}>◀</button>
          <button onClick={goToNextMonth} className="bg-gray-500 text-white px-2 py-1 rounded text-sm" disabled={isSelectorDisabled}>▶</button>
          {canAddMonth && (
            <button onClick={addNewMonth} className="bg-green-600 text-white px-3 py-1 rounded text-sm">+ Ajouter mois</button>
          )}
          {!isSelectorDisabled && currentMonth && selectedEglise && (
            <button onClick={handleDeleteMonth} className="bg-red-600 text-white px-3 py-1 rounded text-sm" disabled={isDeleting}>
              {isDeleting ? 'Suppression...' : '🗑️ Supprimer ce mois'}
            </button>
          )}
        </div>
        <div className="text-center">
          <label className="block text-sm font-medium">Code :</label>
          <input type="text" value={churchConfig.code || ''} onChange={e => setChurchConfig({...churchConfig, code: e.target.value})} className="border rounded px-2 py-1 w-32 text-center" placeholder="Code" disabled={isInputDisabled} />
        </div>
        <div className="text-right">
          <div><strong>Eglise :</strong></div>
          {hasFixedChurch || isAdmin ? (
            <div className="border rounded px-2 py-1 bg-gray-100 min-w-[150px] text-center">
              {selectedEglise || user?.eglise || "Non définie"}
            </div>
          ) : isPasteur ? (
            <div>
              <input
                type="text"
                list="eglises-list-pasteur"
                value={selectedEglise || ''}
                onChange={e => onEgliseChange && onEgliseChange(e.target.value)}
                className="border rounded px-2 py-1 bg-white w-full"
                disabled={isSelectorDisabled}
                placeholder="Nom de l'église"
              />
              <datalist id="eglises-list-pasteur">
                {eglises.map(eg => <option key={eg} value={eg} />)}
              </datalist>
            </div>
          ) : (
            <select
              value={selectedEglise || ''}
              onChange={e => onEgliseChange && onEgliseChange(e.target.value)}
              className="border rounded px-2 py-1 bg-white"
              disabled={isSelectorDisabled}
            >
              {eglises.map(eg => <option key={eg} value={eg}>{eg}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-3 no-print">
        <div className="flex gap-2">
          <select value={sabbathIndex} onChange={e => setSabbathIndex(e.target.value)} className="border rounded-lg p-2 bg-gray-50" disabled={isSelectorDisabled}>
            <option value="">-- Sélectionner un Sabata --</option>
            <option value="1">Sabata Faha-1</option>
            <option value="2">Sabata Faha-2</option>
            <option value="3">Sabata Faha-3</option>
            <option value="4">Sabata Faha-4</option>
            <option value="5">Sabata Faha-5</option>
          </select>
          {/* 🔥 BOUTON BILLETAGE */}
          {sabbathIndex && entries.length > 0 && (
            <button
              onClick={openBilletage}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <i className="fas fa-cash-register"></i>
              Billetage
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>Sabata (daty) :</span>
          <input type="date" value={sabbathDate} onChange={handleSabbathDateChange} className="border rounded px-2 py-1" disabled={isInputDisabled} />
          {loadingDate && <span className="text-blue-500 animate-pulse">⏳</span>}
        </div>
      </div>

      {!sabbathIndex && (
        <div className="bg-yellow-100 p-3 rounded mb-3 text-center">Veuillez sélectionner un Sabata pour commencer.</div>
      )}

      {sabbathIndex && (
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] text-sm border-collapse border border-black">
            <thead className="bg-gray-100">
              <tr className="text-center">
                <th rowSpan="2" className="bg-gray-200 border p-1">N°</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Anarana na SABATA</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Rosia n°</th>
                <th colSpan="8" className="bg-blue-100 border p-1">AROTSAKA ANY AMIN'NY FEDERASIONA (A)</th>
                <th colSpan="2" className="bg-green-100 border p-1">MIJANONA HO AN'NY FIANGONANA (B)</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Tontalin'ny A</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Tontalin'ny B</th>
                <th rowSpan="2" className="bg-gray-200 border p-1">Action</th>
              </tr>
              <tr className="text-xs">
                <th className="bg-blue-50 border p-1 text-center">(1) Ampahafolony</th>
                <th className="bg-blue-50 border p-1 text-center">(2) Sekoly Sabata faha-13</th>
                <th className="bg-blue-50 border p-1 text-center">(3) Fanambinana</th>
                <th className="bg-blue-50 border p-1 text-center">(4) Tsingerin-taona</th>
                <th className="bg-blue-50 border p-1 text-center">(5) Fanompoam-pivavahana 50%</th>
                <th className="bg-blue-50 border p-1 text-center">(6) Federasiona</th>
                <th className="bg-blue-50 border p-1 text-center">(7) Maneran-tany</th>
                <th className="bg-blue-50 border p-1 text-center">(8) Manokana</th>
                <th className="bg-green-50 border p-1 text-center">(9) Fiangonana</th>
                <th className="bg-green-50 border p-1 text-center">(10) Manokana</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const sumA = (entry.f1||0)+(entry.f2||0)+(entry.f3||0)+(entry.f4||0)+(entry.f5||0)+(entry.f6||0)+(entry.f7||0)+(entry.f8||0);
                const sumB = (entry.b9||0)+(entry.b10||0);
                const isLocked = lockedRows[idx] || false;
                const isInputDisabledRow = isInputDisabled || isLocked || isSaving;
                return (
                  <tr key={entry.id}>
                    <td className="border p-1 text-center">{idx+1}</td>
                    <td className="border p-1"><input type="text" value={entry.memberName || ''} onChange={e => updateEntry(entry.id, 'memberName', e.target.value)} className="w-32 border px-1" placeholder="Anarana" disabled={isInputDisabledRow} /></td>
                    <td className="border p-1"><input type="text" value={entry.rosia || ''} onChange={e => updateEntry(entry.id, 'rosia', e.target.value)} className="w-24 border px-1" placeholder="Rosia n°" disabled={isInputDisabledRow} /></td>
                    {['f1','f2','f3','f4','f5','f6','f7','f8'].map(f => (
                      <td key={f} className="border p-1 bg-blue-50"><input type="number" value={entry[f] || 0} onChange={e => updateEntry(entry.id, f, parseFloat(e.target.value)||0)} className="w-24 border text-right px-1" step="any" disabled={isInputDisabledRow} /></td>
                    ))}
                    <td className="border p-1 bg-green-50"><input type="number" value={entry.b9 || 0} onChange={e => updateEntry(entry.id, 'b9', parseFloat(e.target.value)||0)} className="w-24 border text-right" step="any" disabled={isInputDisabledRow} /></td>
                    <td className="border p-1 bg-green-50"><input type="number" value={entry.b10 || 0} onChange={e => updateEntry(entry.id, 'b10', parseFloat(e.target.value)||0)} className="w-24 border text-right" step="any" disabled={isInputDisabledRow} /></td>
                    <td className="border p-1 text-right bg-blue-100">{formatNumber(sumA)}</td>
                    <td className="border p-1 text-right bg-green-100">{formatNumber(sumB)}</td>
                    <td className="border p-1 text-center">
                      {!isLocked ? (
                        <button onClick={() => removeRow(entry.id)} className="text-red-500" disabled={isInputDisabledRow}><i className="fas fa-trash"></i></button>
                      ) : (
                        <button onClick={() => unlockRow(idx)} className="text-green-600" title="Modifier cette ligne" disabled={isSaving}><i className="fas fa-edit"></i></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              <tr>
                <td colSpan="3" className="border text-right">TOTAL</td>
                <td className="border text-right">{formatNumber(totals.f1)}</td>
                <td className="border text-right">{formatNumber(totals.f2)}</td>
                <td className="border text-right">{formatNumber(totals.f3)}</td>
                <td className="border text-right">{formatNumber(totals.f4)}</td>
                <td className="border text-right">{formatNumber(totals.f5)}</td>
                <td className="border text-right">{formatNumber(totals.f6)}</td>
                <td className="border text-right">{formatNumber(totals.f7)}</td>
                <td className="border text-right">{formatNumber(totals.f8)}</td>
                <td className="border text-right">{formatNumber(totals.b9)}</td>
                <td className="border text-right">{formatNumber(totals.b10)}</td>
                <td className="border text-right bg-blue-200">{formatNumber(totalAGeneral)}</td>
                <td className="border text-right bg-green-200">{formatNumber(totalBGeneral)}</td>
                <td className="border"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex flex-wrap justify-between mt-4 no-print gap-2">
        <div className="flex gap-2">
          <button onClick={addRow} className="bg-emerald-600 text-white px-4 py-2 rounded-lg" disabled={isInputDisabled || isSaving}>
            <i className="fas fa-plus-circle"></i> Ajouter ligne
          </button>
          {showReceiptsButton && (
            <button onClick={handleOpenReceipts} className="bg-indigo-600 text-white px-4 py-2 rounded-lg" disabled={isSaving}>
              <i className="fas fa-file-invoice"></i> Reçus personnels
            </button>
          )}
        </div>
        <button onClick={handleSave} className="bg-indigo-700 text-white px-6 py-2 rounded-lg" disabled={isInputDisabled || isSaving}>
          {isSaving ? 'Sauvegarde...' : <><i className="fas fa-save"></i> Sauvegarder ce Sabata</>}
        </button>
      </div>

      <div className="mt-4 p-2 bg-blue-50 rounded text-sm no-print">
        Les données sauvegardées mettent à jour automatiquement le Grand Livre, les rapports et le carnet de dîme.
        {lockEntries && (
          <div className="mt-1 text-amber-600 font-semibold">
            <i className="fas fa-lock mr-1"></i> Modifications verrouillées (données existantes pour ce sabbat ou mode lecture seule).
          </div>
        )}
      </div>

      {/* 🔥 MODAL BILLETAGE */}
      {renderBilletageModal()}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}