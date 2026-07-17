// frontend/src/components/RecapDistrict.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { usePermissions } from '../hooks/usePermissions';
import { api } from '../services/api';

export default function RecapDistrict({ 
  mode = 'consultation',
  readOnly = false,
  districtProp = null,
  onSelectEglise = null,
  onBack = null
}) {
  const { user } = useUser();
  const { getVisibleDistricts, canViewEglise } = usePermissions();
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(districtProp || user?.district || '');
  const [eglises, setEglises] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isPasteur = user?.fonction === 'Pasteur';
  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isAncienOrTresorier = user?.fonction === 'Ancien' || user?.fonction === 'Trésorier';

  // ============================================================
  // CHARGEMENT DES UTILISATEURS ET DISTRICTS
  // ============================================================
  useEffect(() => {
    async function loadUsersAndDistricts() {
      setLoading(true);
      try {
        const users = await api.getAllUsers();
        setAllUsers(users);
        
        // Extraire les districts uniques
        const districtsList = [...new Set(
          users
            .filter(u => u.district && u.district.trim() !== '')
            .map(u => u.district.trim())
        )].sort();
        
        let visibleDistricts = [];
        
        if (isAdmin) {
          visibleDistricts = districtsList;
        } else if (isPasteur) {
          // ✅ Pasteur : ne voit que son district
          visibleDistricts = user.district ? [user.district] : [];
        } else if (isVerificateur) {
          // Vérificateur : voit tous les districts de sa fédération
          const fedDistricts = districtsList.filter(district => {
            const usersInDistrict = users.filter(u => u.district === district);
            return usersInDistrict.some(u => u.federation === user.federation);
          });
          visibleDistricts = fedDistricts;
        } else if (isAncienOrTresorier) {
          // Ancien/Trésorier : ne voit que son district
          visibleDistricts = user.district ? [user.district] : [];
        }
        
        setDistricts(visibleDistricts);
        
        // Si un district est spécifié dans les props, l'utiliser
        if (districtProp && visibleDistricts.includes(districtProp)) {
          setSelectedDistrict(districtProp);
        } else if (visibleDistricts.length > 0 && !selectedDistrict) {
          setSelectedDistrict(visibleDistricts[0]);
        }
        
      } catch (err) {
        console.error('Erreur chargement utilisateurs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadUsersAndDistricts();
  }, [user, isAdmin, isPasteur, isVerificateur, isAncienOrTresorier, districtProp]);

  // ============================================================
  // CHARGEMENT DES ÉGLISES DU DISTRICT SÉLECTIONNÉ
  // ============================================================
  useEffect(() => {
    async function loadEglises() {
      if (!selectedDistrict) {
        setEglises([]);
        return;
      }
      
      setLoading(true);
      try {
        // Récupérer les églises du district depuis les utilisateurs
        const eglisesList = allUsers
          .filter(u => 
            u.district === selectedDistrict && 
            u.eglise && 
            u.eglise.trim() !== ''
          )
          .map(u => ({
            nom: u.eglise.trim(),
            district: u.district,
            federation: u.federation,
            responsable: u.responsable || '',
            email: u.email || ''
          }));
        
        // Supprimer les doublons
        const uniqueEglises = [];
        const egliseNames = new Set();
        for (const eg of eglisesList) {
          if (!egliseNames.has(eg.nom)) {
            egliseNames.add(eg.nom);
            uniqueEglises.push(eg);
          }
        }
        
        // Trier par nom
        uniqueEglises.sort((a, b) => a.nom.localeCompare(b.nom));
        setEglises(uniqueEglises);
        
      } catch (err) {
        console.error('Erreur chargement églises:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEglises();
  }, [selectedDistrict, allUsers]);

  // ============================================================
  // FILTRER LES ÉGLISES PAR RECHERCHE
  // ============================================================
  const filteredEglises = eglises.filter(eg => 
    eg.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============================================================
  // SÉLECTION D'UNE ÉGLISE
  // ============================================================
  const handleSelectEglise = (eglise) => {
    if (onSelectEglise) {
      onSelectEglise(eglise);
    }
  };

  // ============================================================
  // GÉNÉRER UN RAPPORT POUR UNE ÉGLISE
  // ============================================================
  const handleGenerateReport = async (eglise) => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const report = await api.getMonthlyReport(month, eglise);
      if (report) {
        alert(`Rapport de ${eglise} trouvé !`);
      } else {
        alert(`Aucun rapport trouvé pour ${eglise} au mois ${month}`);
      }
    } catch (err) {
      console.error('Erreur génération rapport:', err);
      alert('Erreur lors de la génération du rapport');
    }
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (loading && districts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-300 rounded-lg">
        <div className="flex items-center text-red-700">
          <i className="fas fa-exclamation-circle text-xl mr-3"></i>
          <div>
            <h3 className="font-bold">Erreur</h3>
            <p>{error}</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* EN-TÊTE */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isPasteur ? '📋 Mon District' : '📋 Récapitulatif District'}
          </h2>
          {isPasteur && (
            <p className="text-sm text-gray-500 mt-1">
              Vous pouvez consulter et gérer les églises de votre district
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-300 flex items-center gap-2"
            >
              <i className="fas fa-arrow-left"></i>
              Retour
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center gap-2"
            >
              <i className="fas fa-sync-alt"></i>
              Rafraîchir
            </button>
          )}
        </div>
      </div>

      {/* SÉLECTEUR DE DISTRICT (Admin seulement) */}
      {isAdmin && districts.length > 1 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="font-medium text-gray-700 mr-3">District :</label>
          <select
            value={selectedDistrict || ''}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Sélectionner un district</option>
            {districts.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* AFFICHAGE DU DISTRICT (Pasteur) */}
      {isPasteur && selectedDistrict && (
        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
          <div className="flex items-center">
            <i className="fas fa-church text-amber-600 text-xl mr-3"></i>
            <div>
              <span className="font-bold text-amber-800">District :</span>
              <span className="ml-2 text-amber-900 font-semibold">{selectedDistrict}</span>
              <span className="ml-4 text-sm text-amber-700">
                <i className="fas fa-users mr-1"></i>
                {eglises.length} église{eglises.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CHAMP DE RECHERCHE */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Rechercher une église..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* LISTE DES ÉGLISES */}
      {loading ? (
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-500">Chargement des églises...</p>
        </div>
      ) : filteredEglises.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <i className="fas fa-church text-5xl text-gray-300 mb-3 block"></i>
          <h3 className="text-lg font-medium text-gray-600">Aucune église trouvée</h3>
          <p className="text-gray-400 text-sm mt-1">
            {searchTerm ? `Aucune église correspond à "${searchTerm}"` : 'Aucune église dans ce district'}
          </p>
          {isPasteur && searchTerm === '' && (
            <p className="text-amber-600 text-sm mt-2">
              <i className="fas fa-info-circle mr-1"></i>
              Vous pouvez créer une nouvelle église depuis le formulaire
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEglises.map((eglise) => (
            <div
              key={eglise.nom}
              className="group bg-white border border-gray-200 rounded-lg p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              onClick={() => handleSelectEglise(eglise.nom)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-800 truncate group-hover:text-blue-600 transition-colors">
                    {eglise.nom}
                  </h3>
                  <div className="mt-1 space-y-1 text-sm text-gray-500">
                    <p className="flex items-center">
                      <i className="fas fa-map-marker-alt w-4 text-gray-400 mr-2"></i>
                      {eglise.district || 'District non défini'}
                    </p>
                    {eglise.responsable && (
                      <p className="flex items-center">
                        <i className="fas fa-user w-4 text-gray-400 mr-2"></i>
                        {eglise.responsable}
                      </p>
                    )}
                    {eglise.email && (
                      <p className="flex items-center text-xs truncate">
                        <i className="fas fa-envelope w-4 text-gray-400 mr-2"></i>
                        {eglise.email}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex flex-col gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEglise(eglise.nom);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-300 flex items-center gap-1 ${
                      mode === 'consultation' || isVerificateur
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                    title="Consulter l'église"
                  >
                    <i className="fas fa-eye"></i>
                    Consulter
                  </button>
                  
                  {!readOnly && !isVerificateur && !isPasteur && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateReport(eglise.nom);
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 transition-all duration-300 flex items-center gap-1"
                      title="Générer le rapport"
                    >
                      <i className="fas fa-file-alt"></i>
                      Rapport
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STATISTIQUES DU DISTRICT */}
      {filteredEglises.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{filteredEglises.length}</div>
              <div className="text-xs text-gray-500">Églises</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedDistrict}</div>
              <div className="text-xs text-gray-500">District</div>
            </div>
            {isPasteur && (
              <div className="text-center col-span-2">
                <div className="text-sm text-amber-600">
                  <i className="fas fa-plus-circle mr-1"></i>
                  Créez une nouvelle église via le Formulaire
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* INFO PASTEUR : POUVOIR CRÉER UNE ÉGLISE */}
      {isPasteur && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <i className="fas fa-info-circle text-blue-600 text-xl mr-3"></i>
            <div>
              <span className="font-medium text-blue-800">
                Vous pouvez créer une nouvelle église
              </span>
              <p className="text-sm text-blue-600 mt-0.5">
                Saisissez son nom dans le formulaire et elle sera automatiquement créée lors de la première sauvegarde.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}