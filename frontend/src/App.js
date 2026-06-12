// src/App.js
import React, { useState, useEffect } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { api } from './services/api';
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

// Composant interne qui utilise le contexte utilisateur
function AppContent() {
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentMonth, setCurrentMonth] = useState(null);
  const [selectedSabbath, setSelectedSabbath] = useState(null);
  const [selectedEglise, setSelectedEglise] = useState(null);
  const [months, setMonths] = useState([]);
  const [hasData, setHasData] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [pasteurMode, setPasteurMode] = useState(null); // null, 'ajout', 'voir'

  // Chargement initial des mois
  useEffect(() => {
    async function loadMonths() {
      const mois = await api.getMonths();
      setMonths(mois);
      if (mois.length > 0 && !currentMonth) setCurrentMonth(mois[0].id);
    }
    loadMonths();
  }, []);

  // Vérifie si des données existent pour le mois/église/sabbat courant
  useEffect(() => {
    async function checkDataExistence() {
      if (!currentMonth || !selectedEglise || !selectedSabbath) {
        setHasData(false);
        return;
      }
      try {
        const glData = await api.getGL(currentMonth);
        const entries = glData && glData[selectedSabbath] ? glData[selectedSabbath] : [];
        setHasData(entries.length > 0);
      } catch (err) {
        console.error("Erreur vérification données", err);
        setHasData(false);
      }
    }
    checkDataExistence();
  }, [currentMonth, selectedEglise, selectedSabbath]);

  // Si un utilisateur est connecté et a une église, on la sélectionne par défaut
  useEffect(() => {
    if (user && user.eglise && !selectedEglise) {
      setSelectedEglise(user.eglise);
    }
  }, [user, selectedEglise]);

  const refreshMonths = async () => {
    const mois = await api.getMonths();
    setMonths(mois);
    if (mois.length > 0 && (!currentMonth || !mois.some(m => m.id === currentMonth))) {
      setCurrentMonth(mois[0].id);
    }
  };

  const refreshAll = async () => {
    await refreshMonths();
    // La vérification hasData se fera via le useEffect
  };

  const handleDataSaved = () => {
    // Déclenche une revérification
    if (currentMonth && selectedEglise && selectedSabbath) {
      api.getGL(currentMonth).then(glData => {
        const entries = glData && glData[selectedSabbath] ? glData[selectedSabbath] : [];
        setHasData(entries.length > 0);
      });
    }
  };

  const handleLogin = (loggedUser) => {
    // Le login est géré par UserContext, mais on peut mettre à jour l'état local si besoin
    if (loggedUser.eglise) setSelectedEglise(loggedUser.eglise);
  };

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
    setShowProfile(false);
    setSelectedSabbath(null);
    setSelectedEglise(null);
    setPasteurMode(null);
    setCurrentMonth(null);
  };

  const handleUserUpdate = (updatedUser) => {
    // Le UserContext n'a pas de méthode update, on pourrait l'ajouter,
    // mais pour l'instant on ne fait rien de spécial car le user est dans le contexte.
    // On peut simplement rafraîchir si nécessaire.
    if (updatedUser.eglise) setSelectedEglise(updatedUser.eglise);
  };

  // Définition des onglets (inchangée)
  const allTabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'fas fa-chart-line', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'formulaire', label: 'Formulaire de remplissage', icon: 'fas fa-edit', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'grandlivre', label: 'Grand Livre détaillé', icon: 'fas fa-book', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recap', label: 'RECAP Grand Livre', icon: 'fas fa-table', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapport', label: 'Rapport mensuel', icon: 'fas fa-chart-pie', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapcomite', label: 'Rapport comité', icon: 'fas fa-users', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'rapportannuel', label: 'Rapport annuel', icon: 'fas fa-calendar-alt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'depenses', label: 'Dépenses', icon: 'fas fa-receipt', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'carnet', label: 'Carnet de dîme', icon: 'fas fa-hand-holding-heart', requireData: true, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapdistrict', label: 'RECAP District', icon: 'fas fa-church', requireData: false, roles: ['Admin', 'Trésorier', 'Ancien', 'Pasteur', 'Vérificateur'] },
    { id: 'recapfederation', label: 'RECAP Fédération', icon: 'fas fa-globe', requireData: false, roles: ['Admin', 'Vérificateur'] },
    { id: 'users', label: 'Utilisateurs', icon: 'fas fa-users-cog', requireData: false, roles: ['Admin'] }
  ];

  const rapportGroupIds = ['grandlivre', 'recap', 'rapport', 'rapcomite', 'rapportannuel', 'depenses'];

  const getVisibleTabs = () => {
    if (!user) return [];
    let tabs = allTabs.filter(tab => tab.roles.includes(user.fonction));
    
    if (user.fonction === 'Trésorier' || user.fonction === 'Ancien') {
      const allowedIds = ['dashboard', 'formulaire', 'carnet', ...rapportGroupIds];
      tabs = tabs.filter(t => allowedIds.includes(t.id));
    }
    
    if (user.fonction === 'Pasteur') {
      if (pasteurMode === 'ajout') {
        return tabs.filter(t => t.id !== 'recapdistrict');
      }
      if (pasteurMode === 'voir') {
        return tabs.filter(t => t.id === 'recapdistrict');
      }
      return [];
    }
    
    if (user.fonction === 'Vérificateur') {
      tabs = tabs.filter(t => t.id !== 'users');
    }
    
    return tabs;
  };

  const visibleTabs = getVisibleTabs();

  const isTabDisabled = (tab) => {
    if (!user) return true;
    if (user.fonction !== 'Pasteur') {
      return tab.requireData && (!currentMonth || !selectedSabbath || !selectedEglise || !hasData);
    }
    // Pasteur
    if (pasteurMode === 'voir') return tab.id !== 'recapdistrict';
    if (pasteurMode === 'ajout') {
      if (tab.id === 'formulaire') return false;
      return !(currentMonth && selectedSabbath && selectedEglise);
    }
    return true;
  };

  const isFormSubmitDisabled = () => {
    if (user?.fonction !== 'Pasteur' || pasteurMode !== 'ajout') return false;
    return !currentMonth || !selectedSabbath || !selectedEglise;
  };

  const isReadOnly = () => {
    if (user?.fonction === 'Vérificateur') return true;
    if (user?.fonction === 'Pasteur' && pasteurMode === 'voir') return true;
    if (user?.fonction === 'Pasteur' && pasteurMode === 'ajout') {
      return hasData;
    }
    return false;
  };

  const renderActiveTab = () => {
    if (!user) return null;
    const commonReadOnly = isReadOnly();
    const formSubmitDisabled = isFormSubmitDisabled();
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard mode={user.fonction === 'Vérificateur' ? 'verificateur' : undefined} />;
      case 'formulaire':
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
            readOnly={commonReadOnly}
            disableSubmit={formSubmitDisabled}
          />
        );
      case 'grandlivre': return <GrandLivre currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} />;
      case 'recap': return <RecapGL currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} />;
      case 'depenses': return <Depenses currentMonth={currentMonth} selectedEglise={selectedEglise} refreshAll={refreshAll} />;
      case 'rapport': return <RapportMensuel currentMonth={currentMonth} selectedEglise={selectedEglise} />;
      case 'rapcomite': return <RapportComite currentMonth={currentMonth} selectedEglise={selectedEglise} />;
      case 'rapportannuel': return <RapportAnnuel selectedEglise={selectedEglise} />;
      case 'carnet': return <CarnetDime currentMonth={currentMonth} selectedEglise={selectedEglise} />;
      case 'recapdistrict': 
        if (user.fonction === 'Pasteur' && pasteurMode === 'voir') {
          return <RecapDistrict mode="consultation" readOnly={true} />;
        } else if (user.fonction === 'Vérificateur') {
          return <RecapDistrict mode="verificateur" readOnly={true} />;
        } else {
          return <RecapDistrict readOnly={commonReadOnly} />;
        }
      case 'recapfederation': return <RecapFederation readOnly={commonReadOnly} />;
      case 'users': return <UsersManagement />;
      default: return <Dashboard />;
    }
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const isPasteur = user.fonction === 'Pasteur';
  const showTabsBar = !showProfile && (
    !isPasteur ||
    pasteurMode === 'ajout' ||
    (pasteurMode === 'voir' && visibleTabs.length > 0)
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6 no-print">
        <div className="flex items-center gap-3"><i className="fas fa-book-open text-indigo-700 text-2xl"></i><h1 className="text-xl font-bold text-gray-800">MATRICE – Gestion des offrandes et dîmes</h1></div>
        <div className="flex items-center gap-4">
          {isPasteur && (
            <div className="flex gap-2">
              <button onClick={() => { setPasteurMode('ajout'); setActiveTab('formulaire'); }} className={`px-3 py-1 rounded text-sm ${pasteurMode === 'ajout' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>AJOUT</button>
              <button onClick={() => { setPasteurMode('voir'); setActiveTab('recapdistrict'); }} className={`px-3 py-1 rounded text-sm ${pasteurMode === 'voir' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>VOIR</button>
            </div>
          )}
          <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 text-sm bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition">
            {user.photo ? <img src={user.photo} alt="avatar" className="w-6 h-6 rounded-full object-cover" /> : <i className="fas fa-user-circle text-lg"></i>}
            <span>{user.nom || user.email} ({user.fonction})</span>
            <i className={`fas fa-chevron-${showProfile ? 'up' : 'down'} text-xs`}></i>
          </button>
          <button onClick={handleLogout} className="text-red-600 hover:text-red-800 text-sm"><i className="fas fa-sign-out-alt"></i> Déconnexion</button>
        </div>
      </div>

      {showTabsBar && (
        <div className="flex flex-wrap gap-2 mb-6 no-print">
          {visibleTabs.map(tab => {
            const disabled = isTabDisabled(tab);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !disabled && setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition ${isActive ? 'bg-indigo-700 text-white' : 'bg-white shadow-sm hover:bg-indigo-50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={disabled}
              >
                <i className={`${tab.icon} mr-1`}></i> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        {showProfile ? <Profile onUserUpdate={handleUserUpdate} onClose={() => setShowProfile(false)} /> : renderActiveTab()}
      </div>
    </div>
  );
}

// Composant principal avec le provider
function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;