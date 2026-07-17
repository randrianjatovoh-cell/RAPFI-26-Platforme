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
  const { getVisibleDistricts } = usePermissions();
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(districtProp || user?.district);
  const [eglises, setEglises] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isPasteur = user?.fonction === 'Pasteur';
  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';

  useEffect(() => {
    async function loadDistricts() {
      try {
        const allUsers = await api.getAllUsers();
        const districtsList = [...new Set(allUsers.map(u => u.district).filter(d => d))];
        
        if (isPasteur) {
          const visible = getVisibleDistricts(
            districtsList.map(d => ({ nom: d }))
          );
          setDistricts(visible.map(d => d.nom));
          if (!selectedDistrict && visible.length > 0) {
            setSelectedDistrict(visible[0].nom);
          }
        } else if (isAdmin || isVerificateur) {
          setDistricts(districtsList);
          if (districtProp) {
            setSelectedDistrict(districtProp);
          }
        }
      } catch (err) {
        console.error('Erreur chargement districts:', err);
        setError(err.message);
      }
    }
    loadDistricts();
  }, [user, isPasteur, isAdmin, isVerificateur, districtProp]);

  useEffect(() => {
    async function loadEglises() {
      if (!selectedDistrict) return;
      
      setLoading(true);
      try {
        const allUsers = await api.getAllUsers();
        const eglisesList = allUsers
          .filter(u => u.district === selectedDistrict && u.eglise)
          .map(u => u.eglise);
        setEglises([...new Set(eglisesList)]);
      } catch (err) {
        console.error('Erreur chargement églises:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEglises();
  }, [selectedDistrict]);

  const handleSelectEglise = (eglise) => {
    if (onSelectEglise) {
      onSelectEglise(eglise);
    }
  };

  const filteredEglises = eglises.filter(eglise =>
    eglise.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 p-6 rounded-lg">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* En-tête */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          {isPasteur ? (
            <>
              <i className="fas fa-church text-amber-600 mr-2"></i>
              Mon District
            </>
          ) : isVerificateur ? (
            <>
              <i className="fas fa-globe text-blue-600 mr-2"></i>
              District - {selectedDistrict}
            </>
          ) : (
            <>
              <i className="fas fa-church text-blue-600 mr-2"></i>
              Récapitulatif District
            </>
          )}
        </h2>
        {onBack && (
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all flex items-center"
          >
            <i className="fas fa-arrow-left mr-2"></i> Retour
          </button>
        )}
      </div>

      {/* Sélecteur de District */}
      {isAdmin && districts.length > 1 && (
        <div className="mb-4 flex items-center">
          <label className="font-medium mr-2">District :</label>
          <select
            value={selectedDistrict || ''}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Info Pasteur */}
      {isPasteur && (
        <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-center">
          <i className="fas fa-info-circle text-amber-600 mr-3 text-xl"></i>
          <div>
            <span className="font-bold">District :</span>
            <span className="ml-2">{selectedDistrict}</span>
            <p className="text-sm text-amber-700 mt-1">
              <i className="fas fa-plus-circle mr-1"></i>
              Vous pouvez créer une nouvelle église en saisissant son nom dans le formulaire.
            </p>
          </div>
        </div>
      )}

      {/* Info Vérificateur */}
      {isVerificateur && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
          <i className="fas fa-info-circle text-blue-600 mr-3 text-xl"></i>
          <div>
            <span className="font-bold">Mode consultation</span>
            <p className="text-sm text-blue-700 mt-1">
              Vous consultez les églises de ce district en lecture seule.
            </p>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-4">
        <div className="relative">
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            placeholder="Rechercher une église..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Liste des églises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEglises.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <i className="fas fa-church text-4xl text-gray-300 mb-3 block"></i>
            <p className="text-gray-500">
              {searchTerm ? 'Aucune église ne correspond à votre recherche' : 'Aucune église trouvée dans ce district'}
            </p>
            {isPasteur && (
              <p className="text-sm text-amber-600 mt-2">
                <i className="fas fa-plus-circle mr-1"></i>
                Utilisez le formulaire pour créer une nouvelle église
              </p>
            )}
          </div>
        ) : (
          filteredEglises.map((eglise) => (
            <div
              key={eglise}
              className="border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:border-amber-500 bg-white group"
              onClick={() => handleSelectEglise(eglise)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg group-hover:text-amber-600 transition-colors">
                    {eglise}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    <i className="fas fa-map-marker-alt mr-1"></i>
                    {selectedDistrict}
                  </div>
                </div>
                <div className="flex gap-2">
                  {mode === 'consultation' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEglise(eglise);
                      }}
                      className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition-colors flex items-center"
                    >
                      <i className="fas fa-eye mr-1"></i> Consulter
                    </button>
                  )}
                  {!readOnly && !isPasteur && !isVerificateur && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEglise(eglise);
                      }}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center"
                    >
                      <i className="fas fa-edit mr-1"></i> Modifier
                    </button>
                  )}
                  {isVerificateur && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectEglise(eglise);
                      }}
                      className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center"
                    >
                      <i className="fas fa-eye mr-1"></i> Voir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Statistiques */}
      {filteredEglises.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              <i className="fas fa-church mr-1"></i>
              {filteredEglises.length} église{filteredEglises.length > 1 ? 's' : ''} trouvée{filteredEglises.length > 1 ? 's' : ''}
            </span>
            {searchTerm && filteredEglises.length !== eglises.length && (
              <span>
                ({eglises.length} au total)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}