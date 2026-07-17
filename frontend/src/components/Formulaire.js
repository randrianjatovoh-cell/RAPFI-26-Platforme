// frontend/src/components/Formulaire.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export default function Formulaire({ 
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
  readOnly = false,
  onOpenReceipts
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [glData, setGlData] = useState({});
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isNewEglise, setIsNewEglise] = useState(false);
  
  const isPasteur = user?.fonction === 'Pasteur';
  const isAdmin = user?.fonction === 'Admin';

  // ============================================================
  // VÉRIFICATION DES DONNÉES EXISTANTES (API)
  // ============================================================
  useEffect(() => {
    async function checkExistingData() {
      if (!currentMonth || !selectedEglise) {
        setHasExistingData(false);
        return;
      }

      try {
        const response = await api.getGL(currentMonth, null, null, selectedEglise);
        let hasData = false;
        for (let s = 1; s <= 5; s++) {
          if (response[s] && response[s].length > 0) {
            hasData = true;
            break;
          }
        }
        setHasExistingData(hasData);
        
        // Mettre à jour le flag pour le mode Pasteur
        if (isPasteur && hasData) {
          setMessage({
            type: 'info',
            text: `📌 Des données existent déjà pour cette église. La sauvegarde mettra à jour les données existantes.`
          });
        } else if (!hasData && isPasteur) {
          setMessage(null);
        }
      } catch (err) {
        console.error('Erreur vérification données:', err);
      }
    }
    checkExistingData();
  }, [currentMonth, selectedEglise, isPasteur]);

  // ============================================================
  // VÉRIFICATION SI L'ÉGLISE EST NOUVELLE (Pasteur)
  // ============================================================
  useEffect(() => {
    async function checkEgliseExists() {
      if (!selectedEglise || !isPasteur) {
        setIsNewEglise(false);
        return;
      }

      try {
        const users = await api.getAllUsers();
        const exists = users.some(u => u.eglise === selectedEglise);
        setIsNewEglise(!exists);
        
        if (!exists && isPasteur) {
          setMessage({
            type: 'success',
            text: `🆕 Nouvelle église "${selectedEglise}". Elle sera automatiquement créée lors de la sauvegarde.`
          });
        } else if (exists && !hasExistingData) {
          setMessage({
            type: 'info',
            text: `📝 Église "${selectedEglise}" existante. Vous pouvez saisir les données.`
          });
        }
      } catch (err) {
        console.error('Erreur vérification église:', err);
      }
    }
    checkEgliseExists();
  }, [selectedEglise, isPasteur, hasExistingData]);

  // ============================================================
  // SAUVEGARDE DES DONNÉES
  // ============================================================
  const handleSave = async () => {
    if (!selectedEglise) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner une église' });
      return;
    }

    if (!selectedSabbath) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un sabbat' });
      return;
    }

    if (!currentMonth) {
      setMessage({ type: 'error', text: 'Veuillez sélectionner un mois' });
      return;
    }

    // Vérifier si des données existent déjà pour ce sabbat
    const sabbathData = glData[selectedSabbath] || [];
    if (sabbathData.length === 0) {
      setMessage({ type: 'warning', text: 'Aucune donnée à sauvegarder' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {};
      dataToSave[selectedSabbath] = sabbathData;

      // Informations supplémentaires pour le backend
      const saveData = {
        month: currentMonth,
        data: dataToSave,
        eglise: selectedEglise,
        district: user.district || '',
        federation: user.federation || ''
      };

      const response = await api.saveGL(saveData);
      
      // Message de succès adapté
      setMessage({
        type: 'success',
        text: response.message || `✅ Données sauvegardées pour ${selectedEglise}`
      });

      // Recharger les données
      const refreshedData = await api.getGL(currentMonth, null, null, selectedEglise);
      setGlData(refreshedData);
      setHasExistingData(true);
      
      if (onDataSaved) onDataSaved();
      
      // Recharger la liste des mois
      if (refreshAll) refreshAll();

    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      
      // Message d'erreur personnalisé
      let errorMsg = 'Erreur lors de la sauvegarde';
      if (err.message.includes('existe déjà')) {
        errorMsg = '⚠️ Ces données existent déjà. La mise à jour a été effectuée.';
      } else if (err.message.includes('église n\'existe pas')) {
        errorMsg = '❌ Cette église n\'existe pas. Veuillez contacter votre administrateur.';
      } else {
        errorMsg = err.message || 'Erreur lors de la sauvegarde';
      }
      
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================
  useEffect(() => {
    async function loadData() {
      if (!currentMonth || !selectedEglise || !selectedSabbath) {
        return;
      }

      setLoading(true);
      try {
        const data = await api.getGL(currentMonth, null, null, selectedEglise);
        setGlData(data);
      } catch (err) {
        console.error('Erreur chargement données:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentMonth, selectedEglise, selectedSabbath]);

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div className="p-4">
      {/* Message */}
      {message && (
        <div className={`p-4 mb-4 rounded-lg ${
          message.type === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
          message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
          message.type === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
          'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Mois */}
        <div>
          <label className="block font-medium mb-1">Mois</label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-full border rounded px-3 py-2"
            disabled={readOnly || saving}
          >
            <option value="">Sélectionner un mois</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Église */}
        <div>
          <label className="block font-medium mb-1">Église</label>
          <input
            type="text"
            value={selectedEglise || ''}
            onChange={(e) => onEgliseChange(e.target.value)}
            className={`w-full border rounded px-3 py-2 ${
              isNewEglise && isPasteur ? 'border-amber-500 bg-amber-50' : ''
            }`}
            placeholder={isPasteur ? "Nom de l'église (nouvelle ou existante)" : "Église"}
            disabled={readOnly || saving || (!isPasteur && !isAdmin)}
          />
          {isNewEglise && isPasteur && (
            <div className="text-xs text-amber-600 mt-1">
              <i className="fas fa-plus-circle mr-1"></i>
              Nouvelle église - sera créée automatiquement
            </div>
          )}
        </div>

        {/* Sabbat */}
        <div>
          <label className="block font-medium mb-1">Sabbat</label>
          <select
            value={selectedSabbath || ''}
            onChange={(e) => onSabbathChange(parseInt(e.target.value))}
            className="w-full border rounded px-3 py-2"
            disabled={readOnly || saving}
          >
            <option value="">Sélectionner un sabbat</option>
            {[1, 2, 3, 4, 5].map((s) => (
              <option key={s} value={s}>Sabbat {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info données existantes */}
      {hasExistingData && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
          <i className="fas fa-info-circle text-blue-600 mr-2"></i>
          <span className="text-blue-800">
            Des données existent déjà pour cette église. La sauvegarde mettra à jour les données.
          </span>
        </div>
      )}

      {/* Contenu du formulaire */}
      {loading ? (
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-500">Chargement des données...</p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          {/* Ici le contenu du formulaire GL (tableau des entrées) */}
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-table text-2xl mb-2 block"></i>
            Formulaire de saisie des dîmes et offrandes
          </div>
        </div>
      )}

      {/* Boutons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleSave}
          disabled={saving || readOnly || !selectedEglise || !selectedSabbath}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Sauvegarde...
            </>
          ) : (
            <>
              <i className="fas fa-save mr-2"></i>
              {hasExistingData ? 'Mettre à jour' : 'Sauvegarder'}
            </>
          )}
        </button>

        {onOpenReceipts && glData[selectedSabbath] && glData[selectedSabbath].length > 0 && (
          <button
            onClick={() => onOpenReceipts({
              entries: glData[selectedSabbath],
              eglise: selectedEglise,
              district: user?.district,
              federation: user?.federation,
              monthId: currentMonth,
              sabbathIndex: selectedSabbath
            })}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            <i className="fas fa-receipt mr-2"></i>
            Voir les reçus
          </button>
        )}
      </div>
    </div>
  );
}