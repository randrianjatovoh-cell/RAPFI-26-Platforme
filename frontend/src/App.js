// frontend/src/App.js
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

// ============================================================
// COULEURS PAISIBLES - Douceur et sérénité 2026
// Palette: Sage Green, Lavender, Soft Peach, Sky Blue, Mint
// ============================================================

const tabColors = {
  dashboard: { 
    bg: 'from-sage-400 via-mint-400 to-teal-400', 
    hover: 'hover:from-sage-500 hover:via-mint-500 hover:to-teal-500', 
    text: 'text-white', 
    shadow: 'shadow-sage-500/30',
    glow: 'shadow-[0_0_30px_rgba(144,205,180,0.25)]',
    border: 'border-sage-300/30'
  },
  formulaire: { 
    bg: 'from-lavender-300 via-purple-300 to-rose-300', 
    hover: 'hover:from-lavender-400 hover:via-purple-400 hover:to-rose-400', 
    text: 'text-white', 
    shadow: 'shadow-lavender-500/30',
    glow: 'shadow-[0_0_30px_rgba(200,180,220,0.25)]',
    border: 'border-lavender-300/30'
  },
  grandlivre: { 
    bg: 'from-sky-300 via-blue-300 to-indigo-300', 
    hover: 'hover:from-sky-400 hover:via-blue-400 hover:to-indigo-400', 
    text: 'text-white', 
    shadow: 'shadow-sky-500/30',
    glow: 'shadow-[0_0_30px_rgba(135,206,235,0.25)]',
    border: 'border-sky-300/30'
  },
  recap: { 
    bg: 'from-rose-200 via-pink-200 to-lavender-200', 
    hover: 'hover:from-rose-300 hover:via-pink-300 hover:to-lavender-300', 
    text: 'text-white', 
    shadow: 'shadow-rose-500/30',
    glow: 'shadow-[0_0_30px_rgba(248,200,200,0.25)]',
    border: 'border-rose-300/30'
  },
  rapport: { 
    bg: 'from-peach-200 via-amber-200 to-yellow-200', 
    hover: 'hover:from-peach-300 hover:via-amber-300 hover:to-yellow-300', 
    text: 'text-white', 
    shadow: 'shadow-amber-500/30',
    glow: 'shadow-[0_0_30px_rgba(255,218,185,0.25)]',
    border: 'border-peach-300/30'
  },
  rapcomite: { 
    bg: 'from-mint-300 via-teal-300 to-sage-300', 
    hover: 'hover:from-mint-400 hover:via-teal-400 hover:to-sage-400', 
    text: 'text-white', 
    shadow: 'shadow-mint-500/30',
    glow: 'shadow-[0_0_30px_rgba(152,215,190,0.25)]',
    border: 'border-mint-300/30'
  },
  rapportannuel: { 
    bg: 'from-lavender-200 via-violet-200 to-purple-200', 
    hover: 'hover:from-lavender-300 hover:via-violet-300 hover:to-purple-300', 
    text: 'text-white', 
    shadow: 'shadow-violet-500/30',
    glow: 'shadow-[0_0_30px_rgba(200,180,220,0.25)]',
    border: 'border-violet-300/30'
  },
  depenses: { 
    bg: 'from-peach-200 via-orange-200 to-amber-200', 
    hover: 'hover:from-peach-300 hover:via-orange-300 hover:to-amber-300', 
    text: 'text-white', 
    shadow: 'shadow-orange-500/30',
    glow: 'shadow-[0_0_30px_rgba(255,218,185,0.25)]',
    border: 'border-peach-300/30'
  },
  carnet: { 
    bg: 'from-rose-200 via-pink-200 to-lavender-200', 
    hover: 'hover:from-rose-300 hover:via-pink-300 hover:to-lavender-300', 
    text: 'text-white', 
    shadow: 'shadow-pink-500/30',
    glow: 'shadow-[0_0_30px_rgba(248,200,200,0.25)]',
    border: 'border-pink-300/30'
  },
  recapdistrict: { 
    bg: 'from-sage-300 via-teal-300 to-cyan-300', 
    hover: 'hover:from-sage-400 hover:via-teal-400 hover:to-cyan-400', 
    text: 'text-white', 
    shadow: 'shadow-teal-500/30',
    glow: 'shadow-[0_0_30px_rgba(144,205,180,0.25)]',
    border: 'border-teal-300/30'
  },
  recapfederation: { 
    bg: 'from-sky-300 via-indigo-300 to-violet-300', 
    hover: 'hover:from-sky-400 hover:via-indigo-400 hover:to-violet-400', 
    text: 'text-white', 
    shadow: 'shadow-indigo-500/30',
    glow: 'shadow-[0_0_30px_rgba(135,206,235,0.25)]',
    border: 'border-indigo-300/30'
  },
  users: { 
    bg: 'from-sage-300 via-mint-300 to-teal-300', 
    hover: 'hover:from-sage-400 hover:via-mint-400 hover:to-teal-400', 
    text: 'text-white', 
    shadow: 'shadow-sage-500/30',
    glow: 'shadow-[0_0_30px_rgba(144,205,180,0.25)]',
    border: 'border-sage-300/30'
  },
  receipts: { 
    bg: 'from-lavender-300 via-rose-300 to-pink-300', 
    hover: 'hover:from-lavender-400 hover:via-rose-400 hover:to-pink-400', 
    text: 'text-white', 
    shadow: 'shadow-rose-500/30',
    glow: 'shadow-[0_0_30px_rgba(200,180,220,0.25)]',
    border: 'border-rose-300/30'
  },
  stats: { 
    bg: 'from-sky-300 via-blue-300 to-indigo-300', 
    hover: 'hover:from-sky-400 hover:via-blue-400 hover:to-indigo-400', 
    text: 'text-white', 
    shadow: 'shadow-sky-500/30',
    glow: 'shadow-[0_0_30px_rgba(135,206,235,0.25)]',
    border: 'border-sky-300/30'
  },
};

// Couleurs inactives paisibles
const inactiveColors = {
  dashboard: 'bg-white/80 text-sage-700 hover:bg-sage-50/90 hover:text-sage-900 hover:shadow-md hover:-translate-y-1 border border-sage-200/40',
  formulaire: 'bg-white/80 text-lavender-700 hover:bg-lavender-50/90 hover:text-lavender-900 hover:shadow-md hover:-translate-y-1 border border-lavender-200/40',
  grandlivre: 'bg-white/80 text-sky-700 hover:bg-sky-50/90 hover:text-sky-900 hover:shadow-md hover:-translate-y-1 border border-sky-200/40',
  recap: 'bg-white/80 text-rose-700 hover:bg-rose-50/90 hover:text-rose-900 hover:shadow-md hover:-translate-y-1 border border-rose-200/40',
  rapport: 'bg-white/80 text-peach-700 hover:bg-peach-50/90 hover:text-peach-900 hover:shadow-md hover:-translate-y-1 border border-peach-200/40',
  rapcomite: 'bg-white/80 text-mint-700 hover:bg-mint-50/90 hover:text-mint-900 hover:shadow-md hover:-translate-y-1 border border-mint-200/40',
  rapportannuel: 'bg-white/80 text-lavender-700 hover:bg-lavender-50/90 hover:text-lavender-900 hover:shadow-md hover:-translate-y-1 border border-lavender-200/40',
  depenses: 'bg-white/80 text-peach-700 hover:bg-peach-50/90 hover:text-peach-900 hover:shadow-md hover:-translate-y-1 border border-peach-200/40',
  carnet: 'bg-white/80 text-rose-700 hover:bg-rose-50/90 hover:text-rose-900 hover:shadow-md hover:-translate-y-1 border border-rose-200/40',
  recapdistrict: 'bg-white/80 text-sage-700 hover:bg-sage-50/90 hover:text-sage-900 hover:shadow-md hover:-translate-y-1 border border-sage-200/40',
  recapfederation: 'bg-white/80 text-sky-700 hover:bg-sky-50/90 hover:text-sky-900 hover:shadow-md hover:-translate-y-1 border border-sky-200/40',
  users: 'bg-white/80 text-sage-700 hover:bg-sage-50/90 hover:text-sage-900 hover:shadow-md hover:-translate-y-1 border border-sage-200/40',
  receipts: 'bg-white/80 text-lavender-700 hover:bg-lavender-50/90 hover:text-lavender-900 hover:shadow-md hover:-translate-y-1 border border-lavender-200/40',
  stats: 'bg-white/80 text-sky-700 hover:bg-sky-50/90 hover:text-sky-900 hover:shadow-md hover:-translate-y-1 border border-sky-200/40',
};

// Icônes avec animations
const tabIcons = {
  dashboard: 'fa-chart-pie',
  formulaire: 'fa-pen-to-square',
  grandlivre: 'fa-book-open',
  recap: 'fa-table',
  rapport: 'fa-chart-bar',
  rapcomite: 'fa-users',
  rapportannuel: 'fa-calendar-alt',
  depenses: 'fa-receipt',
  carnet: 'fa-hand-holding-heart',
  recapdistrict: 'fa-church',
  recapfederation: 'fa-globe',
  users: 'fa-users-cog',
  receipts: 'fa-file-invoice',
  stats: 'fa-chart-simple',
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
  const [isHoveringTab, setIsHoveringTab] = useState(null);
  const [logoHover, setLogoHover] = useState(false);

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
    { id: 'dashboard', label: 'Tableau de bord', icon: 'fa-chart-pie', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'formulaire', label: 'Formulaire', icon: 'fa-pen-to-square', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur'] },
    { id: 'grandlivre', label: 'Grand Livre', icon: 'fa-book-open', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recap', label: 'RECAP GL', icon: 'fa-table', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapport', label: 'Rapport mensuel', icon: 'fa-chart-bar', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapcomite', label: 'Rapport comité', icon: 'fa-users', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapportannuel', label: 'Rapport annuel', icon: 'fa-calendar-alt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'depenses', label: 'Dépenses', icon: 'fa-receipt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'carnet', label: 'Carnet de dîme', icon: 'fa-hand-holding-heart', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapdistrict', label: 'RECAP District', icon: 'fa-church', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapfederation', label: 'RECAP Fédération', icon: 'fa-globe', requireData: false, roles: ['Admin', 'Vérificateur'] },
    { id: 'users', label: 'Utilisateurs', icon: 'fa-users-cog', requireData: false, roles: ['Admin'] },
    { id: 'receipts', label: 'Reçus', icon: 'fa-file-invoice', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur'] }
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

  // Fonction pour obtenir les classes d'un onglet selon son état avec effet 3D amélioré
  const getTabClasses = (tabId, isActive) => {
    if (isActive) {
      const active = tabColors[tabId] || tabColors.dashboard;
      return `bg-gradient-to-r ${active.bg} ${active.hover} ${active.text} shadow-xl ${active.shadow} ${active.glow} transform hover:scale-105 transition-all duration-300 relative overflow-hidden border ${active.border} backdrop-blur-sm`;
    } else {
      const inactive = inactiveColors[tabId] || 'bg-white/80 text-gray-700 hover:bg-gray-100/90 hover:text-gray-900';
      return `${inactive} transition-all duration-300 hover:shadow-lg transform hover:scale-102 hover:-translate-y-0.5`;
    }
  };

  // Rendu du contenu actif
  const renderActiveTab = () => {
    if (!user) return null;
    const readOnly = isReadOnlyForPasteur() || isVerificateur;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="animate-fadeInUp">
            <Dashboard
              selectedFederation={selectedFederation}
              selectedDistrict={selectedDistrict}
              selectedEglise={selectedEglise}
              pasteurMode={pasteurMode}
            />
          </div>
        );
      case 'formulaire':
        if (isVerificateur) return null;
        return (
          <div className="animate-fadeInUp">
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
          </div>
        );
      case 'grandlivre':
        return (
          <div className="animate-fadeInUp">
            <GrandLivre currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />
          </div>
        );
      case 'recap':
        return (
          <div className="animate-fadeInUp">
            <RecapGL currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />
          </div>
        );
      case 'depenses':
        return (
          <div className="animate-fadeInUp">
            <Depenses currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} readOnly={readOnly} />
          </div>
        );
      case 'rapport':
        return (
          <div className="animate-fadeInUp">
            <RapportMensuel currentMonth={currentMonth} selectedEglise={selectedEglise} readOnly={readOnly} />
          </div>
        );
      case 'rapcomite':
        return (
          <div className="animate-fadeInUp">
            <RapportComite currentMonth={currentMonth} selectedEglise={selectedEglise} />
          </div>
        );
      case 'rapportannuel':
        return (
          <div className="animate-fadeInUp">
            <RapportAnnuel selectedEglise={selectedEglise} readOnly={readOnly} />
          </div>
        );
      case 'carnet':
        return (
          <div className="animate-fadeInUp">
            <CarnetDime selectedEglise={selectedEglise} currentMonth={currentMonth} />
          </div>
        );
      case 'recapdistrict':
        if (isVerificateur && selectedDistrictForVerif) {
          return (
            <div className="animate-fadeInUp">
              <RecapDistrict
                mode="verificateur"
                readOnly={true}
                districtProp={selectedDistrictForVerif}
                onSelectEglise={handleSelectEgliseForVerificateur}
                onBack={handleBackToFederation}
              />
            </div>
          );
        } else if (isPasteur && pasteurMode === 'voir') {
          return (
            <div className="animate-fadeInUp">
              <RecapDistrict mode="consultation" readOnly={true} onSelectEglise={handleSelectEgliseFromRecap} />
            </div>
          );
        } else {
          return (
            <div className="animate-fadeInUp">
              <RecapDistrict readOnly={false} onSelectEglise={handleSelectEgliseFromRecap} />
            </div>
          );
        }
      case 'recapfederation':
        return (
          <div className="animate-fadeInUp">
            <RecapFederation readOnly={isVerificateur} onSelectDistrict={handleSelectDistrictFromFederation} />
          </div>
        );
      case 'users':
        return (
          <div className="animate-fadeInUp">
            <UsersManagement />
          </div>
        );
      case 'receipts':
        return (
          <div className="animate-fadeInUp">
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
          </div>
        );
      default:
        return (
          <div className="animate-fadeInUp">
            <Dashboard />
          </div>
        );
    }
  };

  // Rendu de la barre de navigation vérificateur
  const renderVerificateurNavigation = () => {
    if (!isVerificateur || !selectedEglise || !verifEgliseSelected) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gradient-to-r from-sage-50/90 via-mint-50/90 to-teal-50/90 backdrop-blur-sm rounded-xl shadow-lg border border-sage-200/50 no-print animate-slideDown">
        <button
          onClick={handleBackToDistrictList}
          className="bg-gradient-to-r from-sage-600 to-teal-700 hover:from-sage-700 hover:to-teal-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:shadow-xl transform hover:scale-105 hover:-translate-y-0.5"
        >
          <i className="fas fa-arrow-left"></i> Retour
        </button>
        <div className="font-bold text-sage-800 flex items-center gap-2 bg-white/50 px-4 py-2 rounded-lg shadow-inner">
          <i className="fas fa-church text-sage-600 animate-pulse-subtle"></i> 
          ÉGLISE : <span className="text-sage-900">{selectedEglise}</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 bg-white/50 px-3 py-1 rounded-lg">
          <label className="text-sm font-medium text-gray-700">
            <i className="fas fa-calendar-alt text-sage-500 mr-1"></i> Mois :
          </label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-sage-500 focus:border-sage-500 transition-all duration-300"
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${getTabClasses(id, isActive)}`}
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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sage-50 via-mint-50 to-teal-50">
        <div className="text-center animate-pulse">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-sage-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-sage-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <i className="fas fa-church text-sage-400 text-2xl animate-pulse"></i>
            </div>
          </div>
          <p className="mt-4 text-sage-600 font-medium animate-pulse">Vérification de la session...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-mint-50 to-teal-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* EN-TÊTE PAISIBLE AVEC LOGO ET TITRE À GAUCHE */}
        <header className="flex flex-wrap justify-between items-center bg-gradient-to-r from-sage-600 via-teal-600 to-cyan-700 p-4 rounded-2xl shadow-2xl mb-6 no-print text-white relative overflow-hidden animate-slideDown">
          
          {/* Effets de fond décoratifs paisibles */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-sage-400/20 to-mint-400/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-float-slow"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-teal-400/10 to-cyan-400/10 rounded-full translate-y-1/2 -translate-x-1/2 animate-float-slow animation-delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-white/5 to-transparent rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
          
          {/* Lignes lumineuses douces */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sage-300/50 to-transparent animate-shimmer"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-300/50 to-transparent animate-shimmer animation-delay-500"></div>

          {/* =============================================
              LOGO + TITRE À GAUCHE
              ============================================= */}
          <div className="flex items-center gap-4 z-10">
            <div 
              className="relative group"
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
            >
              {/* Effet de halo lumineux doux */}
              <div className={`absolute -inset-1 bg-gradient-to-r from-sage-400 via-teal-400 to-cyan-400 rounded-2xl blur-xl transition-all duration-700 ${logoHover ? 'opacity-100 scale-110' : 'opacity-30 scale-100'}`}></div>
              
              {/* Cercle extérieur 3D */}
              <div className={`absolute -inset-1 rounded-2xl border-2 border-sage-300/30 transition-all duration-700 ${logoHover ? 'opacity-100 rotate-12 scale-110' : 'opacity-0 rotate-0 scale-100'}`}></div>
              
              {/* Logo principal avec effet 3D */}
              <div className={`relative w-14 h-14 bg-gradient-to-br from-sage-400 via-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-700 transform-gpu perspective-600
                ${logoHover ? 'rotate-y-12 rotate-x-6 scale-110 shadow-[0_20px_60px_rgba(144,205,180,0.5)]' : 'rotate-y-6 rotate-x-3 shadow-[0_10px_30px_rgba(144,205,180,0.3)]'}`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Effet de brillance 3D */}
                <div className={`absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 rounded-2xl transition-all duration-700 ${logoHover ? 'opacity-100' : 'opacity-50'}`}></div>
                
                {/* Effet de reflet 3D */}
                <div className={`absolute -top-1 -right-1 w-6 h-6 bg-white/30 rounded-full blur-sm transition-all duration-700 ${logoHover ? 'scale-150 opacity-50' : 'scale-100 opacity-20'}`}></div>
                
                {/* Icône du logo */}
                <img
                  src="/FINANCE.png"
                  alt="Finance"
                  className={`h-9 w-9 object-contain transition-all duration-700 filter drop-shadow-lg ${logoHover ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}`}
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    e.target.parentNode.innerHTML = '<i className="fas fa-coins text-white text-2xl"></i>'; 
                  }}
                />
                
                {/* Effet de lumière 3D */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent transition-all duration-700 ${logoHover ? 'opacity-100' : 'opacity-0'}`}></div>
              </div>
              
              {/* Particules lumineuses */}
              <div className={`absolute -top-2 -right-2 w-3 h-3 bg-sage-300 rounded-full blur-sm animate-ping-slow transition-all duration-700 ${logoHover ? 'opacity-100' : 'opacity-0'}`}></div>
              <div className={`absolute -bottom-1 -left-1 w-2 h-2 bg-teal-300 rounded-full blur-sm animate-ping-slow animation-delay-500 transition-all duration-700 ${logoHover ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>

            {/* Titre */}
            <div className="transform-gpu perspective-600">
              <h1 className="text-xl md:text-2xl font-bold uppercase tracking-wider drop-shadow-lg animate-fadeInLeft transition-all duration-300 hover:scale-105 hover:rotate-1" 
                  style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)' }}>
                {mainTitle}
              </h1>
              <div className="text-xs text-white/60 flex items-center gap-2 mt-0.5 animate-fadeInLeft animation-delay-200">
                <i className="fas fa-circle text-sage-300 text-[6px] animate-pulse"></i>
                <span>SYSTÈME DE GESTION FINANCIÈRE 2026</span>
                <i className="fas fa-circle text-sage-300 text-[6px] animate-pulse"></i>
              </div>
            </div>
          </div>

          {/* =============================================
              AVATAR + DÉCONNEXION À DROITE
              ============================================= */}
          <div className="flex items-center gap-3 z-10">
            {isPasteur && (
              <div className="flex gap-1 bg-white/10 backdrop-blur-sm p-1 rounded-xl border border-white/10 shadow-inner">
                <button
                  onClick={handleAccueil}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                    pasteurMode === 'accueil'
                      ? 'bg-white text-sage-700 shadow-lg transform scale-105 -translate-y-0.5'
                      : 'text-white hover:bg-white/20 hover:scale-105 hover:-translate-y-0.5'
                  }`}
                >
                  <i className="fas fa-home mr-1"></i> ACCUEIL
                </button>
                <button
                  onClick={() => { setPasteurMode('ajout'); setConsultationMode(false); setActiveTab('formulaire'); }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                    pasteurMode === 'ajout'
                      ? 'bg-white text-sage-700 shadow-lg transform scale-105 -translate-y-0.5'
                      : 'text-white hover:bg-white/20 hover:scale-105 hover:-translate-y-0.5'
                  }`}
                >
                  <i className="fas fa-plus-circle mr-1"></i> AJOUT
                </button>
                <button
                  onClick={() => { setPasteurMode('voir'); setConsultationMode(false); setActiveTab('recapdistrict'); }}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-105 ${
                    pasteurMode === 'voir'
                      ? 'bg-white text-sage-700 shadow-lg transform scale-105 -translate-y-0.5'
                      : 'text-white hover:bg-white/20 hover:scale-105 hover:-translate-y-0.5'
                  }`}
                >
                  <i className="fas fa-eye mr-1"></i> VOIR
                </button>
              </div>
            )}

            {/* Avatar + Nom + Déconnexion */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowProfile(!showProfile)} 
                className="flex items-center gap-2 text-sm bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full hover:bg-white/30 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 border border-white/10 shadow-lg"
              >
                {user?.photo ? (
                  <img src={user.photo} alt="avatar" className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-lg animate-pulse-glow" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sage-400 to-teal-500 flex items-center justify-center text-white shadow-lg">
                    <i className="fas fa-user text-xs"></i>
                  </div>
                )}
                <span className="hidden md:inline font-medium text-sm">
                  {user?.nom || user?.email || 'Utilisateur'} 
                  <span className="text-[10px] opacity-70 ml-1">({user?.fonction || 'Rôle'})</span>
                </span>
                <i className={`fas fa-chevron-${showProfile ? 'up' : 'down'} text-[10px] transition-all duration-300 transform ${showProfile ? 'rotate-180' : ''}`}></i>
              </button>

              <button 
                onClick={handleLogout} 
                className="text-red-200 hover:text-white transition-all duration-300 text-xs flex items-center gap-1 hover:bg-red-500/20 px-2 py-1.5 rounded-lg transform hover:scale-105 hover:-translate-y-0.5"
              >
                <i className="fas fa-sign-out-alt"></i> 
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        {/* Barre de navigation vérificateur */}
        {renderVerificateurNavigation()}

        {/* Barre d'onglets principale */}
        {showTabsBar && !(isVerificateur && verifEgliseSelected) && (
          <div className="flex flex-wrap gap-2 mb-6 no-print animate-fadeIn">
            {visibleTabs.map(tab => {
              const disabled = isTabDisabled(tab);
              const isActive = activeTab === tab.id;
              const icon = tabIcons[tab.id] || tab.icon;
              const isHovered = isHoveringTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setActiveTab(tab.id)}
                  onMouseEnter={() => setIsHoveringTab(tab.id)}
                  onMouseLeave={() => setIsHoveringTab(null)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 transform relative ${
                    isActive
                      ? `${getTabClasses(tab.id, true)}`
                      : `${inactiveColors[tab.id] || 'bg-white/80 text-gray-700 hover:bg-gray-100/90 hover:text-gray-900'} hover:shadow-lg hover:-translate-y-1 hover:scale-102`
                  } ${disabled ? 'opacity-40 cursor-not-allowed hover:scale-100 hover:-translate-y-0' : ''}`}
                  disabled={disabled}
                  style={{
                    transform: isActive ? 'perspective(600px) rotateX(2deg)' : 'perspective(600px) rotateX(0deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <i className={`fas ${icon} ${isActive ? 'animate-pulse-subtle' : ''} ${isHovered && !isActive ? 'animate-bounce-subtle' : ''}`}></i>
                    <span>{tab.label}</span>
                    {isActive && (
                      <>
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping-slow"></span>
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></span>
                      </>
                    )}
                  </span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenu principal */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-4 animate-fadeInUp transform-gpu perspective-600">
          {showProfile ? (
            <div className="animate-fadeInUp">
              <Profile onClose={() => setShowProfile(false)} />
            </div>
          ) : (
            renderActiveTab()
          )}
        </div>
      </div>

      {/* ANIMATIONS CSS PAISIBLES */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96) rotateX(-5deg); }
          to { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
        }
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-30px) scale(0.95) rotateY(5deg); }
          to { opacity: 1; transform: translateX(0) scale(1) rotateY(0deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-30px) scale(0.95) rotateX(-10deg); }
          to { opacity: 1; transform: translateY(0) scale(1) rotateX(0deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -15px) scale(1.1); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.15); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50% { box-shadow: 0 0 30px 8px rgba(255,255,255,0.15); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fadeInLeft { animation: fadeInLeft 0.5s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.5s ease-out forwards; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .animate-ping-slow { animation: ping-slow 2s ease-in-out infinite; }
        .animate-pulse-subtle { animation: pulse 2s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 1s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }

        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-200 { animation-delay: 0.2s; }

        .hover\\:scale-102:hover { transform: scale(1.02); }
        .hover\\:rotate-1:hover { transform: rotate(1deg); }
        .hover\\:-translate-y-0\\.5:hover { transform: translateY(-2px); }

        /* Effets 3D */
        .perspective-600 { perspective: 600px; }
        .rotate-y-12 { transform: rotateY(12deg); }
        .rotate-x-6 { transform: rotateX(6deg); }
        .rotate-y-6 { transform: rotateY(6deg); }
        .rotate-x-3 { transform: rotateX(3deg); }
        .transform-gpu { transform: translateZ(0); backface-visibility: hidden; }

        /* Scrollbar paisible */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(240, 248, 245, 0.8);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #90cdb4, #5fa88b, #4a9a7a);
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(144, 205, 180, 0.3);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #7abd9f, #4a9a7a, #3a8a6a);
          box-shadow: 0 0 30px rgba(144, 205, 180, 0.5);
        }

        /* Effet de brillance douce */
        .glow-card {
          position: relative;
          overflow: hidden;
        }
        .glow-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
          animation: rotate-glow 10s linear infinite;
        }
        @keyframes rotate-glow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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