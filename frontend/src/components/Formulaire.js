// frontend/src/components/Formulaire.js
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

export default function Formulaire({ 
  currentMonth, 
  setCurrentMonth, 
  months, 
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
  onOpenReceipts
}) {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [glData, setGlData] = useState({});
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isNewEglise, setIsNewEglise] = useState(false);
  const [entries, setEntries] = useState([]);
  
  const isPasteur = user?.fonction === 'Pasteur';
  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';

  // ============================================================
  // CHARGEMENT DES DONNÉES GL
  // ============================================================
  useEffect(() => {
    async function loadGLData() {
      if (!currentMonth || !selectedEglise) {
        setGlData({});
        setEntries([]);
        return;
      }

      setLoading(true);
      try {
        const data = await api.getGL(currentMonth, null, null, selectedEglise);
        setGlData(data);
        
        if (selectedSabbath && data[selectedSabbath]) {
          setEntries(data[selectedSabbath]);
        } else {
          setEntries([]);
        }
        
        // Vérifier si des données existent pour ce sabbat
        const hasData = data[selectedSabbath] && data[selectedSabbath].length > 0;
        setHasExistingData(hasData);
        
      } catch (err) {
        console.error('Erreur chargement GL:', err);
        setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    }
    loadGLData();
  }, [currentMonth, selectedEglise, selectedSabbath]);

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
        const exists = await api.egliseExists(selectedEglise);
        setIsNewEglise(!exists);
        
        if (!exists && isPasteur) {
          setMessage({
            type: 'success',
            text: `🆕 Nouvelle église "${selectedEglise}". Elle sera automatiquement créée lors de la sauvegarde.`
          });
        } else if (exists && hasExistingData) {
          setMessage({
            type: 'info',
            text: `📌 Des données existent déjà pour cette église. La sauvegarde mettra à jour les données existantes.`
          });
        } else {
          setMessage(null);
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

    if (entries.length === 0) {
      setMessage({ type: 'warning', text: 'Aucune donnée à sauvegarder' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {};
      dataToSave[selectedSabbath] = entries;

      const saveData = {
        month: currentMonth,
        data: dataToSave,
        eglise: selectedEglise,
        district: user.district || '',
        federation: user.federation || ''
      };

      const response = await api.saveGL(saveData);
      
      setMessage({
        type: 'success',
        text: response.message || `✅ Données sauvegardées pour ${selectedEglise}`
      });

      // Recharger les données
      const refreshedData = await api.getGL(currentMonth, null, null, selectedEglise);
      setGlData(refreshedData);
      setHasExistingData(true);
      
      if (onDataSaved) onDataSaved();
      if (refreshAll) refreshAll();

    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      
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
  // AJOUT D'UNE LIGNE
  // ============================================================
  const addEntry = () => {
    const newEntry = {
      memberName: '',
      f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0,
      b9: 0, b10: 0,
      rosia: '',
      sabbathIndex: selectedSabbath,
      eglise: selectedEglise,
      monthId: currentMonth
    };
    setEntries([...entries, newEntry]);
  };

  // ============================================================
  // SUPPRESSION D'UNE LIGNE
  // ============================================================
  const removeEntry = (index) => {
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
  };

  // ============================================================
  // MISE À JOUR D'UNE LIGNE
  // ============================================================
  const updateEntry = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (isVerificateur) {
    return (
      <div className="text-center p-8 text-gray-500">
        <i className="fas fa-lock text-4xl mb-3 block"></i>
        <p>Le Vérificateur est en mode lecture seule.</p>
        <p className="text-sm mt-2">Utilisez les onglets de consultation pour visualiser les données.</p>
      </div>
    );
  }

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
        <div>
          <label className="block font-medium mb-1">Mois</label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            disabled={readOnly || saving}
          >
            <option value="">Sélectionner un mois</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">Église</label>
          <input
            type="text"
            value={selectedEglise || ''}
            onChange={(e) => onEgliseChange(e.target.value)}
            className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
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

        <div>
          <label className="block font-medium mb-1">Sabbat</label>
          <select
            value={selectedSabbath || ''}
            onChange={(e) => onSabbathChange(parseInt(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
      {hasExistingData && !isNewEglise && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
          <i className="fas fa-info-circle text-blue-600 mr-2"></i>
          <span className="text-blue-800">
            Des données existent déjà pour ce sabbat. La sauvegarde mettra à jour les données.
          </span>
        </div>
      )}

      {/* Chargement */}
      {loading ? (
        <div className="flex justify-center items-center p-12">
          <i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
          <span className="ml-3 text-gray-600">Chargement des données...</span>
        </div>
      ) : (
        <>
          {/* Tableau des entrées */}
          {entries.length > 0 && (
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border p-2 text-left">Membre</th>
                    <th className="border p-2 text-right">F1</th>
                    <th className="border p-2 text-right">F2</th>
                    <th className="border p-2 text-right">F3</th>
                    <th className="border p-2 text-right">F4</th>
                    <th className="border p-2 text-right">F5</th>
                    <th className="border p-2 text-right">F6</th>
                    <th className="border p-2 text-right">F7</th>
                    <th className="border p-2 text-right">F8</th>
                    <th className="border p-2 text-right">B9</th>
                    <th className="border p-2 text-right">B10</th>
                    <th className="border p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-2">
                        <input
                          type="text"
                          value={entry.memberName || ''}
                          onChange={(e) => updateEntry(index, 'memberName', e.target.value)}
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du membre"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f1 || 0}
                          onChange={(e) => updateEntry(index, 'f1', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f2 || 0}
                          onChange={(e) => updateEntry(index, 'f2', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f3 || 0}
                          onChange={(e) => updateEntry(index, 'f3', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f4 || 0}
                          onChange={(e) => updateEntry(index, 'f4', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f5 || 0}
                          onChange={(e) => updateEntry(index, 'f5', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f6 || 0}
                          onChange={(e) => updateEntry(index, 'f6', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f7 || 0}
                          onChange={(e) => updateEntry(index, 'f7', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.f8 || 0}
                          onChange={(e) => updateEntry(index, 'f8', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.b9 || 0}
                          onChange={(e) => updateEntry(index, 'b9', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2">
                        <input
                          type="number"
                          value={entry.b10 || 0}
                          onChange={(e) => updateEntry(index, 'b10', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-blue-500"
                          disabled={readOnly}
                        />
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          onClick={() => removeEntry(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          disabled={readOnly}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Boutons */}
          <div className="flex flex-wrap gap-2">
            {!readOnly && !isVerificateur && (
              <button
                onClick={addEntry}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                disabled={!selectedEglise || !selectedSabbath || !currentMonth}
              >
                <i className="fas fa-plus mr-2"></i>
                Ajouter une ligne
              </button>
            )}

            {!readOnly && !isVerificateur && (
              <button
                onClick={handleSave}
                disabled={saving || !selectedEglise || !selectedSabbath || !currentMonth || entries.length === 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
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
            )}

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
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <i className="fas fa-receipt mr-2"></i>
                Voir les reçus
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}