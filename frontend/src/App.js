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

// 🔥 Définition des couleurs des onglets
const tabColorMap = {
  // Couleurs inactives
  inactive: {
    dashboard: 'bg-gray-100 hover:bg-gray-200 text-gray-700',
    formulaire: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700',
    grandlivre: 'bg-blue-50 hover:bg-blue-100 text-blue-700',
    recap: 'bg-green-50 hover:bg-green-100 text-green-700',
    rapport: 'bg-purple-50 hover:bg-purple-100 text-purple-700',
    rapcomite: 'bg-orange-50 hover:bg-orange-100 text-orange-700',
    rapportannuel: 'bg-red-50 hover:bg-red-100 text-red-700',
    depenses: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700',
    carnet: 'bg-pink-50 hover:bg-pink-100 text-pink-700',
    recapdistrict: 'bg-teal-50 hover:bg-teal-100 text-teal-700',
    recapfederation: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700',
    users: 'bg-amber-50 hover:bg-amber-100 text-amber-700',
    receipts: 'bg-rose-50 hover:bg-rose-100 text-rose-700',
  },
  // Couleurs actives
  active: {
    dashboard: 'bg-gray-600 text-white hover:bg-gray-700',
    formulaire: 'bg-indigo-600 text-white hover:bg-indigo-700',
    grandlivre: 'bg-blue-600 text-white hover:bg-blue-700',
    recap: 'bg-green-600 text-white hover:bg-green-700',
    rapport: 'bg-purple-600 text-white hover:bg-purple-700',
    rapcomite: 'bg-orange-600 text-white hover:bg-orange-700',
    rapportannuel: 'bg-red-600 text-white hover:bg-red-700',
    depenses: 'bg-yellow-600 text-white hover:bg-yellow-700',
    carnet: 'bg-pink-600 text-white hover:bg-pink-700',
    recapdistrict: 'bg-teal-600 text-white hover:bg-teal-700',
    recapfederation: 'bg-cyan-600 text-white hover:bg-cyan-700',
    users: 'bg-amber-600 text-white hover:bg-amber-700',
    receipts: 'bg-rose-600 text-white hover:bg-rose-700',
  }
};

// Liste des onglets de consultation (pour le vérificateur)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-200">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-sky-600 rounded-full animate-spin"></div>
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

  // 🔥 Pour le vérificateur : sélectionner un district depuis RecapFederation
  const handleSelectDistrictFromFederation = (district) => {
    setSelectedDistrictForVerif(district);
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapdistrict');
  };

  // 🔥 Pour le vérificateur : revenir à la fédération depuis RecapDistrict
  const handleBackToFederation = () => {
    setSelectedDistrictForVerif(null);
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapfederation');
  };

  // 🔥 Pour le vérificateur : revenir à la liste des districts (depuis la consultation d'une église)
  const handleBackToDistrictList = () => {
    setVerifEgliseSelected(false);
    setSelectedEglise(null);
    setActiveTab('recapdistrict');
  };

  // 🔥 Pour le vérificateur : sélectionner une église depuis RecapDistrict
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
    
    // 🔥 VÉRIFICATEUR
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

  const visibleTabs = getVisibleTabs();

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

  const getTitleWithName = () => {
    const base = `GESTION DES DÎMES ET OFFRANDES - `;
    if (isAdmin) return base + 'ADMINISTRATION';
    if (isVerificateur) return base + `${user?.federation || 'FÉDÉRATION'}`.trim().toUpperCase();
    if (isPasteur) return base + `DISTRICT ${user?.district || ''}`.trim().toUpperCase();
    if (isAncienOrTresorier) return base + `ÉGLISE ${user?.eglise || ''}`.trim().toUpperCase();
    return base + 'UTILISATEUR';
  };

  const mainTitle = getTitleWithName();

  const showTabsBar = !showProfile && (
    !isPasteur ||
    pasteurMode === 'ajout' ||
    pasteurMode === 'voir' ||
    pasteurMode === 'accueil' ||
    pasteurMode === null
  );

  // 🔥 Fonction pour obtenir les classes CSS d'un onglet selon son état actif
  const getTabClasses = (tabId, isActive) => {
    const inactiveClass = tabColorMap.inactive[tabId] || 'bg-gray-50 hover:bg-gray-100 text-gray-700';
    const activeClass = tabColorMap.active[tabId] || 'bg-gray-600 text-white hover:bg-gray-700';
    return isActive ? activeClass : inactiveClass;
  };

  // 🔥 Barre de navigation personnalisée pour le vérificateur
  const renderVerificateurNavigation = () => {
    if (!isVerificateur || !selectedEglise || !verifEgliseSelected) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 no-print">
        <button
          onClick={handleBackToDistrictList}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition"
        >
          <i className="fas fa-arrow-left mr-1"></i> Retour
        </button>
        <div className="font-bold text-blue-800">
          <i className="fas fa-church mr-1"></i> ÉGLISE : {selectedEglise}
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Mois :</label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="border rounded px-2 py-1 bg-white text-sm"
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>{formatMonthYear(m.id)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          {consultationTabIds.map((id) => {
            const isActive = activeTab === id;
            const label = consultationTabsLabels[id] || id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1 rounded text-sm font-medium transition ${getTabClasses(id, isActive)}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-200">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* En-tête */}
        <div className="flex flex-wrap justify-between items-center bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-4 rounded-xl shadow-lg mb-6 no-print text-white">
          <div className="flex items-center gap-3">
            <img
              src="/FINANCE.png"
              alt="Finance"
              className="h-10 w-10 object-contain"
              onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<i class="fas fa-coins text-white text-2xl"></i>'; }}
            />
            <h1 className="text-xl font-bold uppercase tracking-wide">{mainTitle}</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {isPasteur && (
              <div className="flex gap-2">
                <button
                  onClick={handleAccueil}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    pasteurMode === 'accueil'
                      ? 'bg-white text-sky-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  ACCUEIL
                </button>
                <button
                  onClick={() => {
                    setPasteurMode('ajout');
                    setConsultationMode(false);
                    setActiveTab('formulaire');
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    pasteurMode === 'ajout'
                      ? 'bg-white text-sky-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  AJOUT
                </button>
                <button
                  onClick={() => {
                    setPasteurMode('voir');
                    setConsultationMode(false);
                    setActiveTab('recapdistrict');
                  }}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    pasteurMode === 'voir'
                      ? 'bg-white text-sky-700'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  VOIR
                </button>
              </div>
            )}
            <button 
              onClick={() => setShowProfile(!showProfile)} 
              className="flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition"
            >
              {user?.photo ? (
                <img src={user.photo} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <i className="fas fa-user-circle text-lg"></i>
              )}
              <span>{user.nom || user.email} ({user.fonction})</span>
              <i className={`fas fa-chevron-${showProfile ? 'up' : 'down'} text-xs`}></i>
            </button>
            <button onClick={handleLogout} className="text-red-300 hover:text-white transition text-sm">
              <i className="fas fa-sign-out-alt"></i> Déconnexion
            </button>
          </div>
        </div>

        {/* Barre de navigation personnalisée pour le vérificateur */}
        {renderVerificateurNavigation()}

        {/* Barre d'onglets principale avec couleurs */}
        {showTabsBar && !(isVerificateur && verifEgliseSelected) && (
          <div className="flex flex-wrap gap-2 mb-6 no-print">
            {visibleTabs.map(tab => {
              const disabled = isTabDisabled(tab);
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${getTabClasses(tab.id, isActive)} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={disabled}
                >
                  <i className={`${tab.icon} mr-1`}></i> {tab.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4">
          {showProfile ? (
            <Profile onClose={() => setShowProfile(false)} />
          ) : (
            renderActiveTab()
          )}
        </div>
      </div>
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