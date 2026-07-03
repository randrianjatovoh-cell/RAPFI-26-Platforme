// src/components/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { api } from '../services/api';
import { formatMonthYear, escapeHtml } from '../services/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

function formatMontant(value) {
  if (value === undefined || value === null) return '';
  const num = Number(value);
  if (isNaN(num) || num === 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function normalizeEglise(name) {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function Dashboard({ pasteurMode, mode, user: propUser, selectedEglise: propEglise }) {
  const { user: contextUser } = useUser();
  const user = propUser || contextUser;
  const eglise = normalizeEglise(propEglise || user?.eglise || '');

  const isAdmin = user?.fonction === 'Admin';
  const isVerificateur = user?.fonction === 'Vérificateur';
  const isPasteur = user?.fonction === 'Pasteur';
  const isAncienOrTresorier = user?.fonction === 'Ancien' || user?.fonction === 'Trésorier';

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [annualData, setAnnualData] = useState({
    totalA: 0,
    volaSisaTeoAloha: 0,
    volaNiditra: 0,
    volaNivoaka: 0,
    volaAfindra: 0,
    monthlyData: [] // [{ month, totalA, dime, other }]
  });

  const [districtData, setDistrictData] = useState([]);
  const [federationData, setFederationData] = useState([]);

  // ---- Fonction de chargement des données (optimisée avec Promise.all) ----
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const yearStr = selectedYear.toString();

      if (isAncienOrTresorier) {
        const egliseNom = user.eglise;
        if (!egliseNom) {
          setError("Votre compte n'est pas associé à une église.");
          setLoading(false);
          return;
        }

        const months = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        // ✅ Optimisation : Promise.all pour paralléliser les requêtes
        const monthPromises = months.map(async (month, idx) => {
          const monthId = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
          const glData = await api.getGL(monthId, null, null, egliseNom);
          let monthTotalA = 0;
          let monthDime = 0;
          let monthOther = 0;
          let monthTotalB = 0;
          let monthIncome = 0;

          if (glData) {
            for (let s = 1; s <= 5; s++) {
              const entries = glData[s] || [];
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

                monthDime += f1;
                monthOther += f2 + f3 + f4 + f5 + f6 + f7 + f8;
                monthTotalA += f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
                monthTotalB += b9 + b10;
                monthIncome += b9;
              }
            }
          }

          // 🔥 Récupérer les frais (saram-pandefasana) pour ce mois
          const fraisVal = await api.getFrais(monthId, egliseNom);
          // Déduire les frais du total A et des offrandes (other)
          monthTotalA = Math.max(0, monthTotalA - fraisVal);
          monthOther = Math.max(0, monthOther - fraisVal);

          const expensesList = await api.getDepenses(monthId, null, null, egliseNom);
          const monthExpenses = expensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

          return {
            month,
            monthTotalA,
            monthDime,
            monthOther,
            monthTotalB,
            monthExpenses,
            monthIncome,
            idx
          };
        });

        const results = await Promise.all(monthPromises);

        // Initialisation du tableau
        const monthlyData = months.map((month, idx) => ({
          month,
          totalA: 0,
          dime: 0,
          other: 0,
          totalB: 0,
          totalExpenses: 0,
          income: 0
        }));

        let totalA = 0;
        let totalB = 0;
        let totalIncome = 0;
        let totalExpenses = 0;

        // Remplir monthlyData avec les résultats
        results.forEach((res) => {
          const idx = res.idx;
          monthlyData[idx].totalA = res.monthTotalA;
          monthlyData[idx].dime = res.monthDime;
          monthlyData[idx].other = res.monthOther;
          monthlyData[idx].totalB = res.monthTotalB;
          monthlyData[idx].totalExpenses = res.monthExpenses;
          monthlyData[idx].income = res.monthIncome;

          totalA += res.monthTotalA;
          totalB += res.monthTotalB;
          totalIncome += res.monthIncome;
          totalExpenses += res.monthExpenses;
        });

        // Calcul du solde initial (volaSisaTeoAloha)
        let volaSisaTeoAloha = 0;

        try {
          const janMonthId = `${yearStr}-01`;
          const janReport = await api.getMonthlyReport(janMonthId, egliseNom);
          if (janReport && janReport.endOfYear) {
            const endOfYear = JSON.parse(janReport.endOfYear);
            if (endOfYear && typeof endOfYear.previousBalance === 'number') {
              volaSisaTeoAloha = endOfYear.previousBalance;
            }
          }
        } catch (err) {
          console.warn('Erreur récupération solde initial depuis janvier:', err);
        }

        if (volaSisaTeoAloha === 0) {
          try {
            const prevYear = (selectedYear - 1).toString();
            const decMonthId = `${prevYear}-12`;
            const decGL = await api.getGL(decMonthId, null, null, egliseNom);
            let decTotalB = 0;
            if (decGL) {
              for (let s = 1; s <= 5; s++) {
                const entries = decGL[s] || [];
                for (const entry of entries) {
                  decTotalB += (entry.b9 || 0) + (entry.b10 || 0);
                }
              }
            }
            const decExpenses = await api.getDepenses(decMonthId, null, null, egliseNom);
            const decTotalExpenses = decExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            volaSisaTeoAloha = decTotalB - decTotalExpenses;
          } catch (err) {
            console.warn('Erreur calcul solde initial depuis décembre précédent:', err);
          }
        }

        if (volaSisaTeoAloha === 0) {
          const storageKey = `endOfYear_${yearStr}_${egliseNom}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed)) {
              volaSisaTeoAloha = parsed;
            }
          }
        }

        const volaNiditra = totalIncome;
        const volaNivoaka = totalExpenses;
        const volaAfindra = volaSisaTeoAloha + volaNiditra - volaNivoaka;

        setAnnualData({
          totalA,
          volaSisaTeoAloha,
          volaNiditra,
          volaNivoaka,
          volaAfindra,
          monthlyData
        });

      } else if (isPasteur) {
        // ✅ Optimisation : Promise.all pour le pasteur
        const district = user.district;
        if (!district) {
          setError("Votre compte n'est pas associé à un district.");
          setLoading(false);
          return;
        }

        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

        if (eglise) {
          // Une seule église sélectionnée
          const monthPromises = months.map(async (month, idx) => {
            const monthId = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
            const glData = await api.getGL(monthId, null, null, eglise);
            let dime = 0, totalA = 0;
            if (glData) {
              for (let s = 1; s <= 5; s++) {
                const entries = glData[s] || [];
                for (const entry of entries) {
                  dime += entry.f1 || 0;
                  totalA += (entry.f1||0) + (entry.f2||0) + (entry.f3||0) + (entry.f4||0) +
                            (entry.f5||0) + (entry.f6||0) + (entry.f7||0) + (entry.f8||0);
                }
              }
            }
            // 🔥 Récupérer les frais et les déduire de totalA
            const fraisVal = await api.getFrais(monthId, eglise);
            totalA = Math.max(0, totalA - fraisVal);
            return { month, dime, totalA };
          });

          const results = await Promise.all(monthPromises);
          const egliseData = { eglise, monthly: {}, totalDime: 0, totalA: 0 };
          results.forEach(({ month, dime, totalA }) => {
            egliseData.monthly[month] = { dime, totalA };
            egliseData.totalDime += dime;
            egliseData.totalA += totalA;
          });
          setDistrictData([egliseData]);
        } else {
          // Aucune église sélectionnée : on charge toutes celles du district
          const eglisesList = await api.getEglisesByDistrict(district);
          if (eglisesList.length === 0) {
            setError("Aucune église trouvée pour ce district.");
            setLoading(false);
            return;
          }

          const districtPromises = eglisesList.map(async (egliseNom) => {
            const egliseData = { eglise: egliseNom, monthly: {}, totalDime: 0, totalA: 0 };
            const monthPromises = months.map(async (month, idx) => {
              const monthId = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
              const glData = await api.getGL(monthId, null, null, egliseNom);
              let dime = 0, totalA = 0;
              if (glData) {
                for (let s = 1; s <= 5; s++) {
                  const entries = glData[s] || [];
                  for (const entry of entries) {
                    dime += entry.f1 || 0;
                    totalA += (entry.f1||0) + (entry.f2||0) + (entry.f3||0) + (entry.f4||0) +
                              (entry.f5||0) + (entry.f6||0) + (entry.f7||0) + (entry.f8||0);
                  }
                }
              }
              // 🔥 Récupérer les frais et les déduire de totalA
              const fraisVal = await api.getFrais(monthId, egliseNom);
              totalA = Math.max(0, totalA - fraisVal);
              return { month, dime, totalA };
            });

            const results = await Promise.all(monthPromises);
            results.forEach(({ month, dime, totalA }) => {
              egliseData.monthly[month] = { dime, totalA };
              egliseData.totalDime += dime;
              egliseData.totalA += totalA;
            });
            return egliseData;
          });

          const districtDataTemp = await Promise.all(districtPromises);
          setDistrictData(districtDataTemp);
        }

      } else if (isVerificateur) {
        // ✅ Optimisation : Promise.all pour le vérificateur
        const federation = user.federation;
        if (!federation) {
          setError("Votre compte n'est pas associé à une fédération.");
          setLoading(false);
          return;
        }

        const fedEglisesList = await api.getEglisesByFederation(federation);
        if (fedEglisesList.length === 0) {
          setError("Aucune église trouvée pour cette fédération.");
          setLoading(false);
          return;
        }

        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

        const fedPromises = fedEglisesList.map(async (egliseNom) => {
          const egliseData = { eglise: egliseNom, monthly: {}, totalDime: 0, totalA: 0 };
          const monthPromises = months.map(async (month, idx) => {
            const monthId = `${yearStr}-${String(idx + 1).padStart(2, '0')}`;
            const glData = await api.getGL(monthId);
            let dime = 0, totalA = 0;
            if (glData) {
              for (let s = 1; s <= 5; s++) {
                const entries = glData[s] || [];
                for (const entry of entries) {
                  dime += entry.f1 || 0;
                  totalA += (entry.f1||0) + (entry.f2||0) + (entry.f3||0) + (entry.f4||0) +
                            (entry.f5||0) + (entry.f6||0) + (entry.f7||0) + (entry.f8||0);
                }
              }
            }
            // 🔥 Récupérer les frais pour cette église et ce mois
            const fraisVal = await api.getFrais(monthId, egliseNom);
            totalA = Math.max(0, totalA - fraisVal);
            return { month, dime, totalA };
          });

          const results = await Promise.all(monthPromises);
          results.forEach(({ month, dime, totalA }) => {
            egliseData.monthly[month] = { dime, totalA };
            egliseData.totalDime += dime;
            egliseData.totalA += totalA;
          });
          return egliseData;
        });

        const federationDataTemp = await Promise.all(fedPromises);
        setFederationData(federationDataTemp);
      }

    } catch (err) {
      console.error('Dashboard: Erreur globale', err);
      setError(err.message || 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, isAncienOrTresorier, isPasteur, isVerificateur, eglise]);

  // Rechargement quand l'église ou l'année change
  useEffect(() => {
    if (eglise || isPasteur) {
      loadData();
    }
  }, [eglise, selectedYear, loadData]);

  // 🔥 Écouter les mises à jour des frais (depuis RecapGL)
  useEffect(() => {
    const handleFraisUpdate = () => {
      // Rafraîchir les données
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('frais-updated', handleFraisUpdate);
    return () => window.removeEventListener('frais-updated', handleFraisUpdate);
  }, []);

  // Rechargement sur événement data-updated (global)
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('data-updated', refresh);
    return () => window.removeEventListener('data-updated', refresh);
  }, [refresh]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // =================== RENDU ===================
  // (Le rendu est inchangé, identique à votre version)
  // ----- ANCIEN / TRÉSORIER -----
  const renderAncienDashboard = () => {
    const { totalA, volaSisaTeoAloha, volaNiditra, volaNivoaka, volaAfindra, monthlyData } = annualData;

    const pieData = [
      { name: 'Reste', value: volaSisaTeoAloha !== 0 ? Math.abs(volaSisaTeoAloha) : 0.001 },
      { name: 'Entrées', value: volaNiditra !== 0 ? Math.abs(volaNiditra) : 0.001 },
      { name: 'Sorties Eglise', value: volaNivoaka !== 0 ? Math.abs(volaNivoaka) : 0.001 }
    ];
    const pieColors = ['#f59e0b', '#3b82f6', '#ef4444'];

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-xs text-blue-600 uppercase font-semibold">Total A (Fédération)</div>
            <div className="text-xl font-bold text-blue-700">{formatMontant(totalA) || '0'} Ar</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-xs text-yellow-600 uppercase font-semibold">Reste ({selectedYear - 1})</div>
            <div className="text-xl font-bold text-yellow-700">{formatMontant(volaSisaTeoAloha) || '0'} Ar</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-xs text-green-600 uppercase font-semibold">Entrées ({selectedYear})</div>
            <div className="text-xl font-bold text-green-700">{formatMontant(volaNiditra) || '0'} Ar</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-xs text-red-600 uppercase font-semibold">Sorties Eglise ({selectedYear})</div>
            <div className="text-xl font-bold text-red-700">{formatMontant(volaNivoaka) || '0'} Ar</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-xs text-purple-600 uppercase font-semibold">Église ({selectedYear + 1})</div>
            <div className="text-xl font-bold text-purple-700">{formatMontant(volaAfindra) || '0'} Ar</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 no-print">
          <div className="bg-white p-3 rounded shadow" style={{ height: 300 }}>
            <p className="text-center font-medium text-sm">Évolution de la Dîme et des Offrandes</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => `${formatMontant(value)} Ar`} />
                <Legend />
                <Line type="monotone" dataKey="dime" stroke="#f59e0b" name="Dîme" strokeWidth={2} />
                <Line type="monotone" dataKey="other" stroke="#10b981" name="Offrandes" strokeWidth={2} />
                <Line type="monotone" dataKey="totalA" stroke="#3b82f6" name="Total (versé à la Fédération)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-3 rounded shadow" style={{ height: 300 }}>
            <p className="text-center font-medium text-sm">Répartition Reste / Entrées / Sorties</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => {
                    const displayValue = value === 0.001 ? 0 : value;
                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                    const percent = total > 0 ? (displayValue / total) * 100 : 0;
                    return `${name}: ${percent.toFixed(1)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => {
                  const displayValue = value === 0.001 ? 0 : value;
                  return `${formatMontant(displayValue)} Ar`;
                }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };

  // ----- PASTEUR -----
  const renderPasteurDashboard = () => {
    if (districtData.length === 0) {
      return <div className="text-center p-4">Aucune donnée pour ce district.</div>;
    }

    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const lineData = months.map(month => {
      const point = { month };
      districtData.forEach(eg => {
        point[eg.eglise] = eg.monthly[month]?.totalA || 0;
      });
      return point;
    });

    const totalDime = districtData.reduce((acc, eg) => acc + eg.totalDime, 0);
    const totalA = districtData.reduce((acc, eg) => acc + eg.totalA, 0);
    const totalOff = totalA - totalDime;

    const pieData = [
      { name: 'Dîme', value: totalDime || 0.001 },
      { name: 'Offrandes', value: totalOff || 0.001 }
    ];

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-xs text-blue-600 uppercase font-semibold">Total Dîmes</div>
            <div className="text-xl font-bold text-blue-700">
              {formatMontant(totalDime) || '0'} Ar
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-xs text-green-600 uppercase font-semibold">Total Offrandes (A)</div>
            <div className="text-xl font-bold text-green-700">
              {formatMontant(totalOff) || '0'} Ar
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-xs text-purple-600 uppercase font-semibold">Total A (Fédération)</div>
            <div className="text-xl font-bold text-purple-700">
              {formatMontant(totalA) || '0'} Ar
            </div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-xs text-yellow-600 uppercase font-semibold">Nombre d'églises</div>
            <div className="text-xl font-bold text-yellow-700">{districtData.length}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 no-print">
          <div className="bg-white p-3 rounded shadow" style={{ height: 350 }}>
            <p className="text-center font-medium text-sm">Évolution du Total A par église</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `${formatMontant(value)} Ar`} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {districtData.map((eg, idx) => (
                  <Line
                    key={eg.eglise}
                    type="monotone"
                    dataKey={eg.eglise}
                    stroke={colors[idx % colors.length]}
                    name={eg.eglise}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-3 rounded shadow" style={{ height: 350 }}>
            <p className="text-center font-medium text-sm">Répartition Dîme / Offrandes (Total A)</p>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#f59e0b', '#10b981'][index % 2]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatMontant(value)} Ar`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };

  // ----- VÉRIFICATEUR -----
  const renderVerificateurDashboard = () => {
    if (federationData.length === 0) {
      return <div className="text-center p-4">Aucune donnée pour cette fédération.</div>;
    }

    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const lineData = months.map(month => {
      const point = { month };
      federationData.forEach(eg => {
        point[eg.eglise] = eg.monthly[month]?.totalA || 0;
      });
      return point;
    });

    const pieData = federationData.map(eg => ({
      name: eg.eglise,
      value: eg.totalDime || 0.001
    }));

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 p-3 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-xs text-blue-600 uppercase font-semibold">Total Dîmes</div>
            <div className="text-xl font-bold text-blue-700">
              {formatMontant(federationData.reduce((acc, e) => acc + e.totalDime, 0)) || '0'} Ar
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-xs text-green-600 uppercase font-semibold">Total Offrandes (A)</div>
            <div className="text-xl font-bold text-green-700">
              {formatMontant(federationData.reduce((acc, e) => acc + e.totalA, 0)) || '0'} Ar
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg shadow border-l-4 border-purple-500">
            <div className="text-xs text-purple-600 uppercase font-semibold">Nombre d'églises</div>
            <div className="text-xl font-bold text-purple-700">{federationData.length}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-xs text-yellow-600 uppercase font-semibold">Année</div>
            <div className="text-xl font-bold text-yellow-700">{selectedYear}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 no-print">
          <div className="bg-white p-3 rounded shadow" style={{ height: 350 }}>
            <p className="text-center font-medium text-sm">Évolution du Total A par église</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `${formatMontant(value)} Ar`} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {federationData.map((eg, idx) => (
                  <Line
                    key={eg.eglise}
                    type="monotone"
                    dataKey={eg.eglise}
                    stroke={colors[idx % colors.length]}
                    name={eg.eglise}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-3 rounded shadow" style={{ height: 350 }}>
            <p className="text-center font-medium text-sm">Répartition des Dîmes par église (%)</p>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${formatMontant(value)} Ar`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </>
    );
  };

  // ----- RENDU GLOBAL -----
  if (isAdmin) {
    return (
      <div className="text-center p-8 bg-yellow-50 rounded-lg">
        <i className="fas fa-info-circle text-yellow-500 text-4xl mb-4"></i>
        <p className="text-yellow-700 font-semibold">Mode Admin</p>
        <p className="text-gray-600 mt-2">Le tableau de bord est désactivé pour les administrateurs. Veuillez utiliser l'onglet <strong>Formulaire</strong> pour sélectionner une fédération, un district ou une église.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center p-4">Chargement du tableau de bord...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        <i className="fas fa-exclamation-triangle mr-2"></i> Erreur : {error}
        <button onClick={refresh} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-sm">
          <i className="fas fa-sync-alt mr-1"></i> Réessayer
        </button>
      </div>
    );
  }

  const yearSelector = (
    <div className="flex items-center gap-2 no-print">
      <label className="text-sm font-medium">Année :</label>
      <select
        value={selectedYear}
        onChange={e => setSelectedYear(parseInt(e.target.value))}
        className="border rounded px-2 py-1 bg-white"
      >
        {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1, selectedYear + 2].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button onClick={refresh} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition">
        <i className="fas fa-sync-alt mr-1"></i> Rafraîchir
      </button>
    </div>
  );

  let title = 'Tableau de bord - ';
  if (isVerificateur) {
    title += `Fédération: ${user.federation}`;
  } else if (isPasteur) {
    title += `District: ${user.district}`;
  } else if (isAncienOrTresorier) {
    title += `Église: ${user.eglise}`;
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {yearSelector}
      </div>

      {isAncienOrTresorier && renderAncienDashboard()}
      {isPasteur && renderPasteurDashboard()}
      {isVerificateur && renderVerificateurDashboard()}
    </div>
  );
}