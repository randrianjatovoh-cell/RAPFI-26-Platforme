// frontend/src/components/Formulaire.js
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';

// ============================================================
// COMPOSANT DE LIGNE DE SAISIE
// ============================================================
function LigneSaisie({ entry, index, onUpdate, onRemove, readOnly }) {
  const handleChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    onUpdate(index, { ...entry, [field]: numValue });
  };

  const totalMiakatra = (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
                        (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
  
  const totalMijanona = (entry.b9 || 0) + (entry.b10 || 0);
  const total = totalMiakatra + totalMijanona;

  return (
    <div className="border-b border-gray-200 py-3 hover:bg-gray-50 transition-colors">
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Nom du membre */}
        <div className="col-span-2">
          <input
            type="text"
            value={entry.memberName || ''}
            onChange={(e) => handleChange('memberName', e.target.value)}
            placeholder="Nom du membre"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={readOnly}
          />
        </div>

        {/* Rosia */}
        <div className="col-span-1">
          <input
            type="text"
            value={entry.rosia || ''}
            onChange={(e) => handleChange('rosia', e.target.value)}
            placeholder="Rosia"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={readOnly}
          />
        </div>

        {/* Champs f1 à f8 (Miakatra) */}
        {['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'].map((field, idx) => (
          <div key={field} className="col-span-1">
            <input
              type="number"
              value={entry[field] || ''}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={field.toUpperCase()}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={readOnly}
              min="0"
              step="100"
            />
          </div>
        ))}

        {/* Champs b9, b10 (Mijanona) */}
        <div className="col-span-1">
          <input
            type="number"
            value={entry.b9 || ''}
            onChange={(e) => handleChange('b9', e.target.value)}
            placeholder="B9"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={readOnly}
            min="0"
            step="100"
          />
        </div>
        <div className="col-span-1">
          <input
            type="number"
            value={entry.b10 || ''}
            onChange={(e) => handleChange('b10', e.target.value)}
            placeholder="B10"
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={readOnly}
            min="0"
            step="100"
          />
        </div>

        {/* Total */}
        <div className="col-span-1 text-center font-bold text-sm text-blue-600">
          {total > 0 ? total.toLocaleString() : '-'}
        </div>

        {/* Bouton Supprimer */}
        {!readOnly && (
          <div className="col-span-1 text-center">
            <button
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 transition-colors"
              title="Supprimer cette ligne"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL FORMULAIRE
// ============================================================
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
  const [entries, setEntries] = useState([]);
  const [glData, setGlData] = useState({});
  const [hasExistingData, setHasExistingData] = useState(false);
  const [isNewEglise, setIsNewEglise] = useState(false);
  const [totalGeneral, setTotalGeneral] = useState(0);
  
  const isPasteur = user?.fonction === 'Pasteur';
  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';

  // ============================================================
  // AJOUTER UNE NOUVELLE LIGNE
  // ============================================================
  const addEntry = () => {
    const newEntry = {
      memberName: '',
      rosia: '',
      f1: 0,
      f2: 0,
      f3: 0,
      f4: 0,
      f5: 0,
      f6: 0,
      f7: 0,
      f8: 0,
      b9: 0,
      b10: 0
    };
    setEntries([...entries, newEntry]);
  };

  // ============================================================
  // METTRE À JOUR UNE LIGNE
  // ============================================================
  const updateEntry = (index, updatedEntry) => {
    const newEntries = [...entries];
    newEntries[index] = updatedEntry;
    setEntries(newEntries);
  };

  // ============================================================
  // SUPPRIMER UNE LIGNE
  // ============================================================
  const removeEntry = (index) => {
    if (window.confirm('Supprimer cette ligne ?')) {
      const newEntries = entries.filter((_, i) => i !== index);
      setEntries(newEntries);
    }
  };

  // ============================================================
  // CALCULER LE TOTAL GÉNÉRAL
  // ============================================================
  const calculateTotal = useCallback(() => {
    let total = 0;
    for (const entry of entries) {
      const miakatra = (entry.f1 || 0) + (entry.f2 || 0) + (entry.f3 || 0) + (entry.f4 || 0) +
                       (entry.f5 || 0) + (entry.f6 || 0) + (entry.f7 || 0) + (entry.f8 || 0);
      const mijanona = (entry.b9 || 0) + (entry.b10 || 0);
      total += miakatra + mijanona;
    }
    setTotalGeneral(total);
  }, [entries]);

  useEffect(() => {
    calculateTotal();
  }, [calculateTotal]);

  // ============================================================
  // VÉRIFICATION DES DONNÉES EXISTANTES
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
        if (selectedSabbath) {
          hasData = response[selectedSabbath] && response[selectedSabbath].length > 0;
        } else {
          for (let s = 1; s <= 5; s++) {
            if (response[s] && response[s].length > 0) {
              hasData = true;
              break;
            }
          }
        }
        setHasExistingData(hasData);
        
        if (isPasteur && hasData) {
          setMessage({
            type: 'info',
            text: `📌 Des données existent déjà pour cette église (Sabbat ${selectedSabbath || ''}). La sauvegarde mettra à jour les données existantes.`
          });
        } else if (!hasData && isPasteur && selectedSabbath) {
          setMessage(null);
        }
      } catch (err) {
        console.error('Erreur vérification données:', err);
      }
    }
    checkExistingData();
  }, [currentMonth, selectedEglise, selectedSabbath, isPasteur]);

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
            text: `🆕 Nouvelle église "${selectedEglise}". Elle sera automatiquement créée avec l'email ${selectedEglise.toLowerCase().replace(/\s+/g, '_')}@rapfi.eg lors de la sauvegarde.`
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
  // CHARGER LES DONNÉES EXISTANTES
  // ============================================================
  useEffect(() => {
    async function loadData() {
      if (!currentMonth || !selectedEglise) {
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
      } catch (err) {
        console.error('Erreur chargement données:', err);
        setMessage({ type: 'error', text: 'Erreur lors du chargement des données' });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentMonth, selectedEglise, selectedSabbath]);

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

    // Filtrer les lignes vides
    const validEntries = entries.filter(e => e.memberName && e.memberName.trim() !== '');
    if (validEntries.length === 0) {
      setMessage({ type: 'warning', text: 'Veuillez ajouter au moins un membre avec des données' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const dataToSave = {};
      dataToSave[selectedSabbath] = validEntries;

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
      if (selectedSabbath && refreshedData[selectedSabbath]) {
        setEntries(refreshedData[selectedSabbath]);
      }
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
  // RENDU
  // ============================================================
  const isReadOnly = readOnly || isVerificateur || (isPasteur && hasExistingData);

  return (
    <div className="p-4">
      {/* Message */}
      {message && (
        <div className={`p-4 mb-4 rounded-lg flex items-start ${
          message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          message.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          <i className={`fas fa-${
            message.type === 'error' ? 'exclamation-circle' :
            message.type === 'success' ? 'check-circle' :
            message.type === 'warning' ? 'exclamation-triangle' :
            'info-circle'
          } text-xl mr-3 mt-0.5`}></i>
          <div className="flex-1">
            <p>{message.text}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Sélecteurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Mois */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Mois</label>
          <select
            value={currentMonth || ''}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isReadOnly || saving}
          >
            <option value="">Sélectionner un mois</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Église */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Église</label>
          <input
            type="text"
            value={selectedEglise || ''}
            onChange={(e) => onEgliseChange(e.target.value)}
            className={`w-full border rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              isNewEglise && isPasteur ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
            }`}
            placeholder={isPasteur ? "Nom de l'église (nouvelle ou existante)" : "Église"}
            disabled={isReadOnly || saving || (!isPasteur && !isAdmin)}
          />
          {isNewEglise && isPasteur && (
            <div className="text-xs text-amber-600 mt-1 flex items-center">
              <i className="fas fa-plus-circle mr-1"></i>
              Nouvelle église - sera créée avec l'email <strong>{selectedEglise?.toLowerCase().replace(/\s+/g, '_')}@rapfi.eg</strong>
            </div>
          )}
        </div>

        {/* Sabbat */}
        <div>
          <label className="block font-medium text-gray-700 mb-1">Sabbat</label>
          <select
            value={selectedSabbath || ''}
            onChange={(e) => onSabbathChange(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isReadOnly || saving}
          >
            <option value="">Sélectionner un sabbat</option>
            {[1, 2, 3, 4, 5].map((s) => (
              <option key={s} value={s}>Sabbat {s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info données existantes */}
      {hasExistingData && selectedSabbath && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
          <i className="fas fa-info-circle text-blue-600 mr-2"></i>
          <span className="text-blue-800">
            Des données existent déjà pour ce sabbat. La sauvegarde mettra à jour les données.
          </span>
        </div>
      )}

      {/* Tableau de saisie */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* En-tête du tableau */}
        <div className="bg-gray-100 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-2 p-3 font-medium text-gray-700 text-sm">
            <div className="col-span-2">Membre</div>
            <div className="col-span-1">Rosia</div>
            <div className="col-span-1 text-center">F1</div>
            <div className="col-span-1 text-center">F2</div>
            <div className="col-span-1 text-center">F3</div>
            <div className="col-span-1 text-center">F4</div>
            <div className="col-span-1 text-center">F5</div>
            <div className="col-span-1 text-center">F6</div>
            <div className="col-span-1 text-center">F7</div>
            <div className="col-span-1 text-center">F8</div>
            <div className="col-span-1 text-center">B9</div>
            <div className="col-span-1 text-center">B10</div>
            <div className="col-span-1 text-center font-bold">Total</div>
            {!isReadOnly && <div className="col-span-1 text-center">Action</div>}
          </div>
        </div>

        {/* Corps du tableau */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
              <p className="mt-2 text-gray-500">Chargement des données...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-table text-4xl text-gray-300 mb-2 block"></i>
              <p>Aucune donnée pour ce sabbat</p>
              {!isReadOnly && (
                <button
                  onClick={addEntry}
                  className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Ajouter une ligne
                </button>
              )}
            </div>
          ) : (
            entries.map((entry, index) => (
              <LigneSaisie
                key={index}
                entry={entry}
                index={index}
                onUpdate={updateEntry}
                onRemove={removeEntry}
                readOnly={isReadOnly}
              />
            ))
          )}
        </div>

        {/* Pied du tableau */}
        {entries.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-3">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{entries.length}</span> ligne{entries.length > 1 ? 's' : ''}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">Total général :</span>
                <span className="ml-2 text-lg font-bold text-blue-600">
                  {totalGeneral.toLocaleString()} Ar
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="mt-4 flex flex-wrap gap-2">
        {!isReadOnly && (
          <>
            <button
              onClick={addEntry}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-300 flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Ajouter une ligne
            </button>
            
            <button
              onClick={handleSave}
              disabled={saving || !selectedEglise || !selectedSabbath || entries.length === 0}
              className={`px-6 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                hasExistingData
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sauvegarde...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  {hasExistingData ? 'Mettre à jour' : 'Sauvegarder'}
                </>
              )}
            </button>
          </>
        )}

        {onOpenReceipts && entries.length > 0 && selectedSabbath && (
          <button
            onClick={() => onOpenReceipts({
              entries: entries,
              eglise: selectedEglise,
              district: user?.district,
              federation: user?.federation,
              monthId: currentMonth,
              sabbathIndex: selectedSabbath
            })}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center gap-2"
          >
            <i className="fas fa-receipt"></i>
            Voir les reçus
          </button>
        )}

        {isReadOnly && (
          <div className="ml-auto text-sm text-gray-500 flex items-center">
            <i className="fas fa-lock mr-1"></i>
            Mode lecture seule
          </div>
        )}
      </div>

      {/* Info supplémentaire pour le Pasteur */}
      {isPasteur && !isReadOnly && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
          <i className="fas fa-info-circle mr-2"></i>
          En tant que Pasteur, vous pouvez saisir les données de toutes les églises de votre district.
          {!hasExistingData && selectedSabbath && ' Les nouvelles églises seront créées automatiquement.'}
        </div>
      )}
    </div>
  );
}