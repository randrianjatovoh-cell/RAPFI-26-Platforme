const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export function getAuthToken() {
  if (!authToken) authToken = localStorage.getItem('token');
  return authToken;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    let errorMsg = 'Erreur serveur';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch (e) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Auth
  login(email, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  register(userData) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  },
  getAllUsers() {
    return request('/auth/users');
  },

  // GL
  saveGL(month, data) {
    return request('/gl/save', { method: 'POST', body: JSON.stringify({ month, data }) });
  },
  getGL(month) {
    return request(`/gl/${month}`);
  },

  // Dépenses
  saveDepenses(month, data) {
    return request('/depenses/save', { method: 'POST', body: JSON.stringify({ month, data }) });
  },
  getDepenses(month) {
    return request(`/depenses/${month}`);
  },

  // Membres
  getMembres() {
    return request('/membres');
  },
  addMembre(membre) {
    return request('/membres', { method: 'POST', body: JSON.stringify(membre) });
  },
  updateMembre(id, updates) {
    return request(`/membres/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  },
  deleteMembre(id) {
    return request(`/membres/${id}`, { method: 'DELETE' });
  },

  // Mois
  getMonths() {
    return request('/months');
  },
  addMonth(id, name) {
    return request('/months', { method: 'POST', body: JSON.stringify({ id, name }) });
  },

  // Configuration église
  getChurchConfig() {
    return request('/config');
  },
  saveChurchConfig(config) {
    return request('/config', { method: 'POST', body: JSON.stringify(config) });
  },

  // Rapports mensuels
  getMonthlyReport(month, eglise) {
    return request(`/reports/monthly/${month}/${eglise}`);
  },
  updateReportField(month, eglise, field, value) {
    return request('/reports/field', { method: 'PUT', body: JSON.stringify({ month, eglise, field, value }) });
  },
  updateSabbathDate(month, eglise, sabbathIndex, date) {
    return request('/reports/sabbath-date', { method: 'PUT', body: JSON.stringify({ month, eglise, sabbathIndex, date }) });
  },
  getAllMonthlyReportsForEglise(eglise) {
    return request(`/reports/eglise/${eglise}`);
  },
  getAllMonthlyReportsByDistrict(district) {
    return request(`/reports/district/${district}`);
  },
  getAllMonthlyReportsByFederation(federation) {
    return request(`/reports/federation/${federation}`);
  },

  // Frais
  getFrais(month, eglise) {
    return request(`/frais/${month}/${eglise}`);
  },
  setFrais(month, eglise, frais) {
    return request('/frais', { method: 'POST', body: JSON.stringify({ month, eglise, frais }) });
  },

  // Stats membres
  getMembersStats() {
    return request('/stats/members');
  },

  // Logs
  getUserLogs() {
    return request('/logs');
  },
  addUserLog(userId, userName, userFonction) {
    return request('/logs', { method: 'POST', body: JSON.stringify({ userId, userName, userFonction }) });
  },
  getUniqueVisitorsCount() {
    return request('/logs/unique');
  },
  getVisitsPerUser() {
    return request('/logs/visits');
  },

  // Utilisateurs (profil)
  updateUser(id, updates) {
    return request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  },
  updateUserPhoto(id, photoDataURL) {
    return request(`/users/${id}/photo`, { method: 'PUT', body: JSON.stringify({ photo: photoDataURL }) });
  },
  updateUserPassword(id, newPassword) {
    return request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password: newPassword }) });
  },

  // Églises par district/fédération
  getAllEglisesByDistrict(district) {
    return request(`/eglises/district/${district}`);
  },
  getAllEglisesByFederation(federation) {
    return request(`/eglises/federation/${federation}`);
  },
  getFederationReports(federation, year, month) {
    return request(`/reports/federation/${federation}?year=${year}&month=${month}`);
  }
};