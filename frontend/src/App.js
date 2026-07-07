import React, { useState, useEffect } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { api } from './services/api';
import { usePermissions } from './hooks/usePermissions';
import { ReceiptsProvider, useReceipts } from './context/ReceiptsContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Formulaire from './components/Formulaire';
import GrandLivre from './components/GrandLivre';
import RecapGL from './components/RecapGL';
import Depenses from './components/Depenses';
import RapportMensuel from './components/RapportMensuel';
import RapportComite from './components/RapportComite';
import CarnetDime from './components/CarnetDime';
import RecapDistrict from './components/RecapDistrict';
import UsersManagement from './components/UserManagement';
import Profile from './components/Profile';
import RapportAnnuel from './components/RapportAnnuel';
import RecapFederation from './components/RecapFederation';
import Receipts from './components/Receipts';
import { formatMonthYear } from './services/helpers';

// Couleurs dynamiques pour les onglets actifs
const tabColors = {
  dashboard: { bg: 'from-blue-500 to-indigo-600', hover: 'hover:from-blue-600 hover:to-indigo-700', text: 'text-white' },
  formulaire: { bg: 'from-emerald-500 to-teal-600', hover: 'hover:from-emerald-600 hover:to-teal-700', text: 'text-white' },
  grandlivre: { bg: 'from-cyan-500 to-blue-600', hover: 'hover:from-cyan-600 hover:to-blue-700', text: 'text-white' },
  recap: { bg: 'from-purple-500 to-pink-600', hover: 'hover:from-purple-600 hover:to-pink-700', text: 'text-white' },
  rapport: { bg: 'from-amber-500 to-orange-600', hover: 'hover:from-amber-600 hover:to-orange-700', text: 'text-white' },
  rapcomite: { bg: 'from-rose-500 to-red-600', hover: 'hover:from-rose-600 hover:to-red-700', text: 'text-white' },
  rapportannuel: { bg: 'from-violet-500 to-purple-600', hover: 'hover:from-violet-600 hover:to-purple-700', text: 'text-white' },
  depenses: { bg: 'from-yellow-500 to-amber-600', hover: 'hover:from-yellow-600 hover:to-amber-700', text: 'text-white' },
  carnet: { bg: 'from-pink-500 to-rose-600', hover: 'hover:from-pink-600 hover:to-rose-700', text: 'text-white' },
  recapdistrict: { bg: 'from-teal-500 to-cyan-600', hover: 'hover:from-teal-600 hover:to-cyan-700', text: 'text-white' },
  recapfederation: { bg: 'from-indigo-500 to-blue-600', hover: 'hover:from-indigo-600 hover:to-blue-700', text: 'text-white' },
  users: { bg: 'from-gray-600 to-gray-700', hover: 'hover:from-gray-700 hover:to-gray-800', text: 'text-white' },
  receipts: { bg: 'from-rose-500 to-pink-600', hover: 'hover:from-rose-600 hover:to-pink-700', text: 'text-white' },
};

// Couleurs inactives
const inactiveColors = {
  dashboard: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  formulaire: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  grandlivre: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  recap: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  rapport: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  rapcomite: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  rapportannuel: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  depenses: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  carnet: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  recapdistrict: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  recapfederation: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  users: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  receipts: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
};

// Liste des onglets de consultation pour le vérificateur
const consultationTabIds = ['grandlivre', 'recap', 'rapport', 'rapcomite', 'rapportannuel', 'depenses', 'carnet'];
const consultationTabsLabels = {
  grandlivre: 'Grand Livre',
  recap: 'RECAP GL',
  rapport: 'Rapport mensuel',
  rapcomite: 'Rapport comité',
  rapportannuel: 'Rapport annuel',
  depenses: 'Dépenses',
  carnet: 'Carnet de dîme'
};

function AppContent() {
  const { user, loading, logout } = useUser();
  const { receiptsData, updateReceipts } = useReceipts();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(null);
  const [selectedSabbath, setSelectedSabbath] = useState(null);
  const [selectedEglise, setSelectedEglise] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedFederation, setSelectedFederation] = useState(null);
  const [months, setMonths] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [pasteurMode, setPasteurMode] = useState(null);
  const [consultationMode, setConsultationMode] = useState(false);
  const [showReceiptsTab, setShowReceiptsTab] = useState(false);
  const [pasteurReadOnly, setPasteurReadOnly] = useState(false);

  // États pour le vérificateur
  const [selectedDistrictForVerif, setSelectedDistrictForVerif] = useState(null);
  const [verifEgliseSelected, setVerifEgliseSelected] = useState(false);

  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isPasteur = user?.fonction === 'Pasteur';
  const isAncienOrTresorier = user?.fonction === 'Ancien' || user?.fonction === 'Trésorier';

  // Vérification des données existantes pour le mois/église (Pasteur)
  useEffect(() => {
    if (!isPasteur || !currentMonth || !selectedEglise) {
      setPasteurReadOnly(false);
      return;
    }
    async function checkExistingData() {
      try {
        const glData = await api.getGL(currentMonth, null, null, selectedEglise);
        let hasAnyData = false;
        if (glData) {
          for (let s = 1; s <= 5; s++) {
            if (glData[s] && glData[s].length > 0) {
              hasAnyData = true;
              break;
            }
          }
        }
        setPasteurReadOnly(hasAnyData);
      } catch (err) {
        console.error('Erreur vérification données existantes:', err);
        setPasteurReadOnly(false);
      }
    }
    checkExistingData();
  }, [currentMonth, selectedEglise, isPasteur]);

  useEffect(() => {
    if (!user) return;
    async function loadMonths() {
      try {
        const mois = await api.getMonths();
        setMonths(mois);
        if (mois.length > 0 && !currentMonth) setCurrentMonth(mois[0].id);
      } catch (err) {
        if (err.message === "SESSION_EXPIRED") console.warn("Session expirée");
        else console.error("Erreur chargement mois :", err);
      }
    }
    loadMonths();
  }, [user, currentMonth]);

  useEffect(() => {
    if (!user || !currentMonth || !selectedEglise || !selectedSabbath) {
      setHasData(false);
      return;
    }
    async function checkDataExistence() {
      try {
        const glData = await api.getGL(currentMonth, null, null, selectedEglise);
        const entries = glData && glData[selectedSabbath] ? glData[selectedSabbath] : [];
        setHasData(entries.length > 0);
      } catch (err) {
        console.error("Erreur vérification données", err);
        setHasData(false);
      }
    }
    checkDataExistence();
  }, [currentMonth, selectedEglise, selectedSabbath, user]);

  useEffect(() => {
    if (user && user.eglise && !selectedEglise && isAncienOrTresorier) {
      setSelectedEglise(user.eglise);
    }
  }, [user, selectedEglise, isAncienOrTresorier]);

  // Fonctions de rafraîchissement
  const refreshMonths = async () => {
    if (!user) return;
    try {
      const mois = await api.getMonths();
      setMonths(mois);
      if (mois.length > 0 && (!currentMonth || !mois.some(m => m.id === currentMonth))) {
        setCurrentMonth(mois[0].id);
      }
    } catch (err) {
      if (err.message === "SESSION_EXPIRED") console.warn("Session expirée");
      else console.error("Erreur refreshMonths :", err);
    }
  };

  const refreshAll = async () => {
    await refreshMonths();
  };

  const handleDataSaved = () => {
    if (currentMonth && selectedEglise && selectedSabbath) {
      api.getGL(currentMonth, null, null, selectedEglise)
        .then(glData => {
          const entries = glData && glData[selectedSabbath] ? glData[selectedSabbath] : [];
          setHasData(entries.length > 0);
        })
        .catch(err => console.error("Erreur handleDataSaved", err));
    }
  };

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    setShowProfile(false);
    setSelectedSabbath(null);
    setSelectedEglise(null);
    setPasteurMode(null);
    setConsultationMode(false);
    setCurrentMonth(null);
    setShowReceiptsTab(false);
    setSelectedDistrictForVerif(null);
    setVerifEgliseSelected(false);
  };

  const handleOpenReceipts = (data) => {
    if (data) {
      updateReceipts(data);
    }
    setShowReceiptsTab(true);
    setActiveTab('receipts');
  };

  const onCloseReceipts = () => {
    setShowReceiptsTab(false);
    setActiveTab('formulaire');
  };

  const handleSelectEgliseFromRecap = (eglise) => {
    setConsultationMode(true);
    setSelectedEglise(eglise);
    setPasteurMode('ajout');
    setActiveTab('formulaire');
    setSelectedSabbath(null);
  };

  const handleAccueil = () => {
    setPasteurMode('accueil');
    setSelectedEglise(null);
    setConsultationMode(false);
    setActiveTab('dashboard');
    setSelectedSabbath(null);
  };

  const handleSelectDistrictFromFederation = (district) => {
    setSelectedDistrictForVerif(district);
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapdistrict');
  };

  const handleBackToFederation = () => {
    setSelectedDistrictForVerif(null);
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapfederation');
  };

  const handleBackToDistrictList = () => {
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapdistrict');
  };

  const handleSelectEgliseForVerificateur = (eglise) => {
    setSelectedEglise(eglise);
    setVerifEgliseSelected(true);
    const firstConsultTab = consultationTabIds[0] || 'grandlivre';
    setActiveTab(firstConsultTab);
    setSelectedSabbath(null);
    if (months.length > 0 && !currentMonth) {
      setCurrentMonth(months[0].id);
    }
  };

  // Liste de tous les onglets disponibles
  const allTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'fas fa-chart-line', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'formulaire', label: 'Formulaire de remplissage', icon: 'fas fa-edit', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur'] },
    { id: 'grandlivre', label: 'Grand Livre détaillé', icon: 'fas fa-book', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recap', label: 'RECAP Grand Livre', icon: 'fas fa-table', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapport', label: 'Rapport mensuel', icon: 'fas fa-chart-pie', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapcomite', label: 'Rapport comité', icon: 'fas fa-users', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapportannuel', label: 'Rapport annuel', icon: 'fas fa-calendar-alt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'depenses', label: 'Dépenses', icon: 'fas fa-receipt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'carnet', label: 'Carnet de dîme', icon: 'fas fa-hand-holding-heart', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapdistrict', label: 'RECAP District', icon: 'fas fa-church', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapfederation', label: 'RECAP Fédération', icon: 'fas fa-globe', requireData: false, roles: ['Admin', 'Vérificateur'] },
    { id: 'users', label: 'Utilisateurs', icon: 'fas fa-users-cog', requireData: false, roles: ['Admin'] },
    { id: 'receipts', label: 'Reçus personnels', icon: 'fas fa-file-invoice', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur'] }
  ];

  const rapportGroupIds = ['grandlivre', 'recap', 'rapport', 'rapcomite', 'rapportannuel', 'depenses'];

  const getVisibleTabs = () => {
    if (!user) return [];
    let tabs = allTabs.filter(tab => tab.roles.includes(user.fonction));
    tabs = tabs.filter(tab => tab.id !== 'receipts' || showReceiptsTab);

    if (isAncienOrTresorier) {
      tabs = tabs.filter(t => ['dashboard', 'formulaire', 'carnet', ...rapportGroupIds].includes(t.id) || t.id === 'receipts');
    }
    
    if (isPasteur) {
      if (pasteurMode === null || pasteurMode === 'accueil') {
        return tabs.filter(t => t.id === 'dashboard');
      }
      if (pasteurMode === 'ajout') {
        const allowed = ['dashboard', 'formulaire', 'grandlivre', 'recap', 'rapport', 'rapcomite', 'rapportannuel', 'depenses', 'carnet'];
        return tabs.filter(t => allowed.includes(t.id));
      }
      if (pasteurMode === 'voir') {
        return tabs.filter(t => t.id === 'recapdistrict');
      }
      return [];
    }
    
    // Vérificateur
    if (isVerificateur) {
      let tabsForVerif = tabs.filter(tab => tab.id === 'dashboard' || tab.id === 'recapfederation');
      
      if (selectedDistrictForVerif) {
        const recapDistrictTab = allTabs.find(t => t.id === 'recapdistrict');
        if (recapDistrictTab) {
          tabsForVerif.push(recapDistrictTab);
        }
      }
      
      if (selectedEglise && verifEgliseSelected) {
        const consultationTabsFiltered = allTabs.filter(t => 
          consultationTabIds.includes(t.id) && t.roles.includes('Vérificateur')
        );
        tabsForVerif = [...tabsForVerif, ...consultationTabsFiltered];
      }
      
      return tabsForVerif;
    }
    
    return tabs;
  };

  const isTabDisabled = (tab) => {
    if (!user) return true;
    if (isPasteur) {
      if (pasteurMode === 'voir') return tab.id !== 'recapdistrict';
      if (pasteurMode === 'ajout') {
        if (tab.id === 'formulaire') return false;
        return !(currentMonth && selectedSabbath && selectedEglise);
      }
      if (pasteurMode === 'accueil') return tab.id !== 'dashboard';
      return true;
    }
    if (tab.requireData) {
      if (isVerificateur && selectedEglise && verifEgliseSelected) {
        return false;
      }
      return !(currentMonth && selectedSabbath && selectedEglise && hasData);
    }
    return false;
  };

  const isReadOnlyForPasteur = () => {
    if (isPasteur && pasteurReadOnly) return true;
    if (isPasteur && consultationMode) return true;
    return false;
  };

  const getTitleWithName = () => {
    const base = `GESTION DES DÎMES ET OFFRANDES - `;
    if (isAdmin) return base + 'ADMINISTRATION';
    if (isVerificateur) return base + `${user?.federation || 'FÉDÉRATION'}`.trim().toUpperCase();
    if (isPasteur) return base + `DISTRICT ${user?.district || ''}`.trim().toUpperCase();
    if (isAncienOrTresorier) return base + `ÉGLISE ${user?.eglise || ''}`.trim().toUpperCase();
    return base + 'UTILISATEUR';
  };

  // Fonction pour obtenir les classes d'un onglet selon son état
  const getTabClasses = (tabId, isActive) => {
    if (isActive) {
      const active = tabColors[tabId] || tabColors.dashboard;
      return `bg-gradient-to-r ${active.bg} ${active.hover} ${active.text} shadow-md transform hover:scale-105 transition-all duration-200`;
    } else {
      const inactive = inactiveColors[tabId] || 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      return `${inactive} transition-all duration-200 hover:shadow`;
    }
  };

  // Rendu du contenu actif
  const renderActiveTab = () => {
    if (!user) return null;
    const readOnly = isReadOnlyForPasteur() || isVerificateur;

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            selectedFederation={selectedFederation}
            selectedDistrict={selectedDistrict}
            selectedEglise={selectedEglise}
            pasteurMode={pasteurMode}
          />
        );
      case 'formulaire':
        if (isVerificateur) return null;
        return (
          <Formulaire
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            months={months}
            setMonths={setMonths}
            refreshAll={refreshAll}
            onDataSaved={handleDataSaved}
            selectedSabbath={selectedSabbath}
            onSabbathChange={setSelectedSabbath}
            selectedEglise={selectedEglise}
            onEgliseChange={setSelectedEglise}
            selectedDistrict={selectedDistrict}
            onDistrictChange={setSelectedDistrict}
            selectedFederation={selectedFederation}
            onFederationChange={setSelectedFederation}
            readOnly={readOnly || false}
            onOpenReceipts={handleOpenReceipts}
          />
        );
      case 'grandlivre':
        return <GrandLivre currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />;
      case 'recap':
        return <RecapGL currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />;
      case 'depenses':
        return <Depenses currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />;
      case 'rapport':
        return <RapportMensuel currentMonth={currentMonth} selectedEglise={selectedEglise} readOnly={readOnly} />;
      case 'rapcomite':
        return <RapportComite currentMonth={currentMonth} selectedEglise={selectedEglise} />;
      case 'rapportannuel':
        return <RapportAnnuel selectedEglise={selectedEglise} readOnly={readOnly} />;
      case 'carnet':
        return <CarnetDime selectedEglise={selectedEglise} currentMonth={currentMonth} />;
      case 'recapdistrict':
        if (isVerificateur && selectedDistrictForVerif) {
          return (
            <RecapDistrict
              mode="verificateur"
              readOnly={true}
              districtProp={selectedDistrictForVerif}
              onSelectEglise={handleSelectEgliseForVerificateur}
              onBack={handleBackToFederation}
            />
          );
        } else if (isPasteur && pasteurMode === 'voir') {
          return <RecapDistrict mode="consultation" readOnly={true} onSelectEglise={handleSelectEgliseFromRecap} />;
        } else {
          return <RecapDistrict readOnly={false} onSelectEglise={handleSelectEgliseFromRecap} />;
        }
      case 'recapfederation':
        return <RecapFederation readOnly={isVerificateur} onSelectDistrict={handleSelectDistrictFromFederation} />;
      case 'users':
        return <UsersManagement />;
      case 'receipts':
        return (
          <Receipts
            entries={receiptsData.entries}
            eglise={receiptsData.eglise}
            district={receiptsData.district}
            federation={receiptsData.federation}
            sabbathDate={receiptsData.sabbathDate}
            monthId={receiptsData.monthId}
            sabbathIndex={receiptsData.sabbathIndex}
            onClose={onCloseReceipts}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  // Rendu de la barre de navigation vérificateur
  const renderVerificateurNavigation = () => {
    if (!isVerificateur || !selectedEglise || !verifEgliseSelected) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-indigo-200 no-print">
        <button
          onClick={handleBackToDistrictList}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
        >
          <i className="fas fa-arrow-left"></i> Retour
        </button>
        <div className="font-bold text-indigo-800">
          <i className="fas fa-church mr-1"></i> ÉGLISE : {selectedEglise}
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Mois :</label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>{formatMonthYear(m.id)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1">
          {consultationTabIds.map((id) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${getTabClasses(id, isActive)}`}
              >
                {consultationTabsLabels[id] || id}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------
  // RENDU GLOBAL
  // ----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-200">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem('token');
  if (!user || !token) {
    if (user && !token) logout();
    return <Login onLogin={() => {}} />;
  }

  const visibleTabs = getVisibleTabs();
  const mainTitle = getTitleWithName();
  const showTabsBar = !showProfile && (
    !isPasteur ||
    pasteurMode === 'ajout' ||
    pasteurMode === 'voir' ||
    pasteurMode === 'accueil' ||
    pasteurMode === null
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* En-tête avec dégradé moderne */}
        <header className="flex flex-wrap justify-between items-center bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 p-4 rounded-2xl shadow-lg mb-6 no-print text-white relative overflow-hidden">
          <div className="flex items-center gap-3 z-10">
            <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
              <img
                src="/FINANCE.png"
                alt="Finance"
                className="h-8 w-8 object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<i class="fas fa-coins text-white text-2xl"></i>'; }}
              />
            </div>
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider drop-shadow-md">
              {mainTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3 z-10 flex-wrap">
            {isPasteur && (
              <div className="flex gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-xl">
                <button
                  onClick={handleAccueil}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pasteurMode === 'accueil'
                      ? 'bg-white text-indigo-700 shadow'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  ACCUEIL
                </button>
                <button
                  onClick={() => { setPasteurMode('ajout'); setConsultationMode(false); setActiveTab('formulaire'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pasteurMode === 'ajout'
                      ? 'bg-white text-indigo-700 shadow'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  AJOUT
                </button>
                <button
                  onClick={() => { setPasteurMode('voir'); setConsultationMode(false); setActiveTab('recapdistrict'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pasteurMode === 'voir'
                      ? 'bg-white text-indigo-700 shadow'
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  VOIR
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowProfile(!showProfile)} 
              className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
            >
              {user?.photo ? (
                <img src={user.photo} alt="avatar" className="w-7 h-7 rounded-full object-cover border-2 border-white" />
              ) : (
                <i className="fas fa-user-circle text-xl"></i>
              )}
              <span className="hidden sm:inline">{user.nom || user.email} ({user.fonction})</span>
              <i className={`fas fa-chevron-${showProfile ? 'up' : 'down'} text-xs transition-transform duration-200`}></i>
            </button>
            <button onClick={handleLogout} className="text-red-200 hover:text-white transition-all duration-200 text-sm flex items-center gap-1">
              <i className="fas fa-sign-out-alt"></i> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
          {/* Effets de fond décoratifs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </header>

        {/* Barre de navigation vérificateur */}
        {renderVerificateurNavigation()}

        {/* Barre d'onglets principale */}
        {showTabsBar && !(isVerificateur && verifEgliseSelected) && (
          <div className="flex flex-wrap gap-2 mb-6 no-print animate-fadeIn">
            {visibleTabs.map(tab => {
              const disabled = isTabDisabled(tab);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform ${
                    isActive
                      ? `bg-gradient-to-r ${tabColors[tab.id]?.bg || 'from-gray-600 to-gray-700'} text-white shadow-md hover:scale-105`
                      : `${inactiveColors[tab.id] || 'bg-gray-100 text-gray-700 hover:bg-gray-200'} hover:shadow`
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                  disabled={disabled}
                >
                  <i className={`${tab.icon} mr-1`}></i> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenu principal */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 animate-fadeInUp">
          {showProfile ? (
            <Profile onClose={() => setShowProfile(false)} />
          ) : (
            renderActiveTab()
          )}
        </div>
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <ReceiptsProvider>
        <AppContent />
      </ReceiptsProvider>
    </UserProvider>
  );
}

export default App;