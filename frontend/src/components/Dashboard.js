// frontend/src/components/Dashboard.js
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [annualData, setAnnualData] = useState({
    totalA: 0,
    volaSisaTeoAloha: 0,
    volaNiditra: 0,
    volaNivoaka: 0,
    volaAfindra: 0,
    monthlyData: []
  });

  const [districtData, setDistrictData] = useState([]);
  const [federationData, setFederationData] = useState([]);

  // Helper pour récupérer une valeur quel que soit la casse (pour les champs du rapport)
  function getField(obj, name) {
    if (!obj || typeof obj !== 'object') return undefined;
    if (obj[name] !== undefined) return obj[name];
    const lowerName = name.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === lowerName) return obj[key];
    }
    return undefined;
  }

  // ---- Chargement des données ----
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
                monthIncome += b9 + b10;
              }
            }
          }

          const fraisVal = await api.getFrais(monthId, egliseNom);
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

        // 🔥 Récupération du solde initial (VOLA SISA TEO ALOHA) depuis le Rapport Annuel
        let volaSisaTeoAloha = 0;
        try {
          const janMonthId = `${yearStr}-01`;
          const janReport = await api.getMonthlyReport(janMonthId, egliseNom);
          
          if (janReport) {
            // 1. Essayer de lire depuis endOfYear.previousBalance (le champ du Rapport Annuel)
            const eoyRaw = getField(janReport, 'endOfYear');
            if (eoyRaw) {
              try {
                const eoy = typeof eoyRaw === 'string' ? JSON.parse(eoyRaw) : eoyRaw;
                if (eoy && typeof eoy.previousBalance === 'number') {
                  volaSisaTeoAloha = eoy.previousBalance;
                  console.log(`✅ Solde initial chargé depuis endOfYear: ${volaSisaTeoAloha}`);
                }
              } catch(e) { /* ignore */ }
            }
            
            // 2. Si pas trouvé, essayer depuis volaSisaTeoAloha (la nouvelle colonne)
            if (volaSisaTeoAloha === 0) {
              const sisaValue = getField(janReport, 'volaSisaTeoAloha');
              if (sisaValue !== undefined && sisaValue !== null) {
                volaSisaTeoAloha = Number(sisaValue);
                console.log(`✅ Solde initial chargé depuis volaSisaTeoAloha: ${volaSisaTeoAloha}`);
              }
            }
          }
        } catch (err) {
          console.warn('Erreur récupération solde initial depuis janvier:', err);
        }

        // 3. Fallback : si toujours 0, essayer localStorage
        if (volaSisaTeoAloha === 0) {
          const storageKey = `endOfYear_${yearStr}_${egliseNom}`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed)) {
              volaSisaTeoAloha = parsed;
              console.log(`✅ Solde initial chargé depuis localStorage: ${volaSisaTeoAloha}`);
            }
          }
        }

        // 4. Fallback ultime : calculer depuis décembre précédent
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
            console.log(`✅ Solde initial calculé depuis décembre précédent: ${volaSisaTeoAloha}`);
          } catch (err) {
            console.warn('Erreur calcul solde initial depuis décembre précédent:', err);
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
        // ... (code existant pour Pasteur, inchangé)
        const district = user.district;
        if (!district) {
          setError("Votre compte n'est pas associé à un district.");
          setLoading(false);
          return;
        }
        const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

        if (eglise) {
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
        // ... (code existant pour Vérificateur, inchangé)
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
      setIsRefreshing(false);
    }
  }, [user, selectedYear, isAncienOrTresorier, isPasteur, isVerificateur, eglise]);

  useEffect(() => {
    if (eglise || isPasteur) {
      loadData();
    }
  }, [eglise, selectedYear, loadData]);

  useEffect(() => {
    const handleFraisUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('frais-updated', handleFraisUpdate);
    return () => window.removeEventListener('frais-updated', handleFraisUpdate);
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    window.addEventListener('data-updated', refresh);
    return () => window.removeEventListener('data-updated', refresh);
  }, [refresh]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // =================== RENDU (inchangé) ===================

  // Composant StatCard avec animations
  const StatCard = ({ title, value, icon, color, delay }) => {
    const gradientMap = {
      blue: 'from-blue-500 to-blue-600',
      yellow: 'from-yellow-500 to-yellow-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600',
      purple: 'from-purple-500 to-purple-600',
      indigo: 'from-indigo-500 to-indigo-600',
      pink: 'from-pink-500 to-pink-600',
    };
    const bgColor = gradientMap[color] || 'from-gray-500 to-gray-600';

    return (
      <div
        className={`bg-gradient-to-r ${bgColor} text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:rotate-1 p-4 animate-fadeInUp`}
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">{title}</div>
            <div className="text-2xl font-bold mt-1">{value || '0'} Ar</div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2.5 hover:animate-pulse">
            <i className={`fas ${icon} text-xl`}></i>
          </div>
        </div>
      </div>
    );
  };

  // Cartes pour Ancien / Trésorier
  const ancienStatCards = [
    { title: 'Total A (Fédération)', value: formatMontant(annualData.totalA), icon: 'fa-chart-line', color: 'blue', delay: 100 },
    { title: 'Reste (précédent)', value: formatMontant(annualData.volaSisaTeoAloha), icon: 'fa-history', color: 'yellow', delay: 200 },
    { title: 'Entrées (Église)', value: formatMontant(annualData.volaNiditra), icon: 'fa-arrow-down', color: 'green', delay: 300 },
    { title: 'Sorties (Église)', value: formatMontant(annualData.volaNivoaka), icon: 'fa-arrow-up', color: 'red', delay: 400 },
    { title: 'EGLISE (suivant)', value: formatMontant(annualData.volaAfindra), icon: 'fa-forward', color: 'purple', delay: 500 }
  ];

  // Pasteur
  const pasteurStatCards = (totalDime, totalOff, totalA, count) => [
    { title: 'Total Dîmes', value: formatMontant(totalDime), icon: 'fa-hand-holding-heart', color: 'blue', delay: 100 },
    { title: 'Total Offrandes (A)', value: formatMontant(totalOff), icon: 'fa-gift', color: 'green', delay: 200 },
    { title: 'Total A (Fédération)', value: formatMontant(totalA), icon: 'fa-chart-line', color: 'purple', delay: 300 },
    { title: "Nombre d'églises", value: count, icon: 'fa-church', color: 'yellow', delay: 400 }
  ];

  // Vérificateur
  const verifStatCards = (totalDime, totalOff, count, year) => [
    { title: 'Total Dîmes', value: formatMontant(totalDime), icon: 'fa-hand-holding-heart', color: 'blue', delay: 100 },
    { title: 'Total Offrandes (A)', value: formatMontant(totalOff), icon: 'fa-gift', color: 'green', delay: 200 },
    { title: "Nombre d'églises", value: count, icon: 'fa-church', color: 'purple', delay: 300 },
    { title: 'Année', value: year, icon: 'fa-calendar-alt', color: 'yellow', delay: 400 }
  ];

  // ----- ANCIEN / TRÉSORIER -----
  const renderAncienDashboard = () => {
    const { monthlyData } = annualData;

    const pieData = [
      { name: 'Reste', value: annualData.volaSisaTeoAloha !== 0 ? Math.abs(annualData.volaSisaTeoAloha) : 0.001 },
      { name: 'Entrées', value: annualData.volaNiditra !== 0 ? Math.abs(annualData.volaNiditra) : 0.001 },
      { name: 'Sorties', value: annualData.volaNivoaka !== 0 ? Math.abs(annualData.volaNivoaka) : 0.001 }
    ];
    const pieColors = ['#f59e0b', '#10b981', '#ef4444'];

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {ancienStatCards.map((card, idx) => (
            <StatCard key={idx} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 no-print">
          {/* Graphique courbes */}
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <div className="text-center mb-3">
              <div className="font-bold text-base text-indigo-700 uppercase tracking-wide">FEDERATION</div>
              <div className="text-sm font-medium text-gray-500">Évolution de la Dîme et des Offrandes</div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4b5563' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4b5563' }} />
                <Tooltip
                  formatter={(value) => `${formatMontant(value)} Ar`}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="dime" stroke="#f59e0b" name="Dîme" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} animationDuration={1500} />
                <Line type="monotone" dataKey="other" stroke="#10b981" name="Offrandes" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} animationDuration={1500} />
                <Line type="monotone" dataKey="totalA" stroke="#3b82f6" name="Total (versé à la Fédération)" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} animationDuration={1500} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graphique secteur 3D */}
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative animate-fadeInUp" style={{ animationDelay: '400ms', perspective: '1000px' }}>
            <div className="text-center mb-3">
              <div className="font-bold text-base text-indigo-700 uppercase tracking-wide">EGLISE LOCALE</div>
              <div className="text-sm font-medium text-gray-500">Répartition Reste / Entrées / Sorties</div>
            </div>
            <div
              style={{
                transform: 'rotateX(5deg) rotateY(5deg)',
                transition: 'transform 0.4s ease-in-out',
                transformStyle: 'preserve-3d'
              }}
              className="hover:rotateX-0 hover:rotateY-0"
            >
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
                    stroke="white"
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => {
                      const displayValue = value === 0.001 ? 0 : value;
                      return `${formatMontant(displayValue)} Ar`;
                    }}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ----- PASTEUR -----
  const renderPasteurDashboard = () => {
    if (districtData.length === 0) {
      return <div className="text-center p-4 text-gray-500">Aucune donnée pour ce district.</div>;
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
    const pieColors = ['#f59e0b', '#10b981'];

    const cards = pasteurStatCards(totalDime, totalOff, totalA, districtData.length);

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {cards.map((card, idx) => (
            <StatCard key={idx} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 no-print">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <p className="text-center font-semibold text-gray-700 mb-2">Évolution du Total A par église</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4b5563' }} />
                <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} />
                <Tooltip
                  formatter={(value) => `${formatMontant(value)} Ar`}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                {districtData.map((eg, idx) => (
                  <Line
                    key={eg.eglise}
                    type="monotone"
                    dataKey={eg.eglise}
                    stroke={COLORS[idx % COLORS.length]}
                    name={eg.eglise}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    animationDuration={1500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative animate-fadeInUp" style={{ animationDelay: '400ms', perspective: '1000px' }}>
            <p className="text-center font-semibold text-gray-700 mb-2">Répartition Dîme / Offrandes (Total A)</p>
            <div
              style={{
                transform: 'rotateX(5deg) rotateY(5deg)',
                transition: 'transform 0.4s ease-in-out',
                transformStyle: 'preserve-3d'
              }}
              className="hover:rotateX-0 hover:rotateY-0"
            >
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
                    stroke="white"
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${formatMontant(value)} Ar`}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ----- VÉRIFICATEUR -----
  const renderVerificateurDashboard = () => {
    if (federationData.length === 0) {
      return <div className="text-center p-4 text-gray-500">Aucune donnée pour cette fédération.</div>;
    }

    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const lineData = months.map(month => {
      const point = { month };
      federationData.forEach(eg => {
        point[eg.eglise] = eg.monthly[month]?.totalA || 0;
      });
      return point;
    });

    const totalDime = federationData.reduce((acc, e) => acc + e.totalDime, 0);
    const totalA = federationData.reduce((acc, e) => acc + e.totalA, 0);
    const totalOff = totalA - totalDime;

    const pieData = federationData.map(eg => ({
      name: eg.eglise,
      value: eg.totalDime || 0.001
    }));

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

    const cards = verifStatCards(totalDime, totalOff, federationData.length, selectedYear);

    return (
      <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {cards.map((card, idx) => (
            <StatCard key={idx} {...card} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 no-print">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 animate-fadeInUp" style={{ animationDelay: '200ms' }}>
            <p className="text-center font-semibold text-gray-700 mb-2">Évolution du Total A par église</p>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#4b5563' }} />
                <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} />
                <Tooltip
                  formatter={(value) => `${formatMontant(value)} Ar`}
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
                {federationData.map((eg, idx) => (
                  <Line
                    key={eg.eglise}
                    type="monotone"
                    dataKey={eg.eglise}
                    stroke={colors[idx % colors.length]}
                    name={eg.eglise}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    animationDuration={1500}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative animate-fadeInUp" style={{ animationDelay: '400ms', perspective: '1000px' }}>
            <p className="text-center font-semibold text-gray-700 mb-2">Répartition des Dîmes par église</p>
            <div
              style={{
                transform: 'rotateX(5deg) rotateY(5deg)',
                transition: 'transform 0.4s ease-in-out',
                transformStyle: 'preserve-3d'
              }}
              className="hover:rotateX-0 hover:rotateY-0"
            >
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
                    stroke="white"
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${formatMontant(value)} Ar`}
                    contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ----- RENDU GLOBAL -----
  if (isAdmin) {
    return (
      <div className="text-center p-8 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-2xl border border-yellow-200 shadow-lg">
        <i className="fas fa-info-circle text-yellow-500 text-5xl mb-4"></i>
        <p className="text-yellow-700 font-semibold text-lg">Mode Admin</p>
        <p className="text-gray-600 mt-2">Le tableau de bord est désactivé pour les administrateurs. Veuillez utiliser l'onglet <strong>Formulaire</strong> pour sélectionner une fédération, un district ou une église.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 rounded-2xl border border-red-200 shadow-lg">
        <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p className="text-red-600 font-medium">Erreur : {error}</p>
        <button
          onClick={refresh}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 mx-auto"
        >
          <i className="fas fa-sync-alt"></i> Réessayer
        </button>
      </div>
    );
  }

  const yearSelector = (
    <div className="flex items-center gap-3 no-print">
      <label className="text-sm font-medium text-gray-700">Année :</label>
      <select
        value={selectedYear}
        onChange={e => setSelectedYear(parseInt(e.target.value))}
        className="border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
      >
        {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1, selectedYear + 2].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <button
        onClick={refresh}
        disabled={isRefreshing}
        className={`bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
        Rafraîchir
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .hover\\:rotateX-0:hover {
          transform: rotateX(0deg) rotateY(0deg) !important;
        }
        .hover\\:rotateY-0:hover {
          transform: rotateX(0deg) rotateY(0deg) !important;
        }
      `}</style>

      <div className="flex flex-wrap justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-indigo-800 flex items-center gap-2">
          <i className="fas fa-chart-pie text-indigo-600"></i>
          {title}
        </h2>
        {yearSelector}
      </div>

      {isAncienOrTresorier && renderAncienDashboard()}
      {isPasteur && renderPasteurDashboard()}
      {isVerificateur && renderVerificateurDashboard()}
    </div>
  );
}