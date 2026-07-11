// frontend/src/services/api.js
// ⚠️ URL forcée pour la production (Render)
const API_URL = 'https://rapfi-backend.onrender.com/api';

console.log('🚀 API_URL =', API_URL);

class ApiService {
  constructor() {
    try {
      this.token = localStorage.getItem('token');
    } catch (e) {
      console.warn('⚠️ localStorage inaccessible, utilisation mémoire');
      this.token = null;
    }
    this.memoryToken = null;
    this.onUnauthorized = null;
  }

  setOnUnauthorized(callback) {
    this.onUnauthorized = callback;
  }

  getAuthToken() {
    try {
      return this.token || localStorage.getItem('token') || this.memoryToken;
    } catch (e) {
      return this.memoryToken || this.token;
    }
  }

  setAuthToken(token) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    } catch (e) {
      this.memoryToken = token;
      console.warn('⚠️ localStorage bloqué, sauvegarde en mémoire');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    console.log(`📤 Requête vers ${url}`);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP error ${response.status}`);
        error.status = response.status;
        if (response.status === 401 || response.status === 403) {
          this.setAuthToken(null);
          if (this.onUnauthorized) {
            this.onUnauthorized(error.message);
          }
        }
        throw error;
      }
      return response.json();
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // ===== AUTH =====
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setAuthToken(data.token);
    }
    return data;
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getUsers() {
    return this.request('/auth/users');
  }

  // ===== USERS =====
  async getAllUsers() {
    return this.request('/users');
  }

  async updateUser(id, data) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadPhoto(id, formData) {
    const url = `${API_URL}/users/${id}/photo`;
    console.log(`📤 Upload photo vers ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur upload');
    }
    return response.json();
  }

  async uploadUserPhoto(id, formData) {
    return this.uploadPhoto(id, formData);
  }

  async updateUserPassword(id, password) {
    return this.request(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    });
  }

  // ===== GL =====
  async getGL(month, federation = null, district = null, eglise = null) {
    let url = `/gl/${month}`;
    const params = new URLSearchParams();
    if (federation) params.append('federation', federation);
    if (district) params.append('district', district);
    if (eglise) params.append('eglise', eglise);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }

  async saveGL(data) {
    return this.request('/gl/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============================================================
  // ✅ MÉTHODES POUR VOLA SISA TEO ALOHA
  // ============================================================

  /**
   * Récupère la valeur de volaSisaTeoAloha pour un mois et une église
   */
  async getVolaSisa(month, eglise) {
    try {
      const data = await this.request(`/reports/volaSisa/${month}/${eglise}`);
      return data.value || 0;
    } catch (err) {
      console.warn('⚠️ Erreur getVolaSisa:', err);
      return 0;
    }
  }

  /**
   * Sauvegarde la valeur de volaSisaTeoAloha pour un mois et une église
   */
  async saveVolaSisa(month, eglise, amount) {
    return this.request('/reports/volaSisa', {
      method: 'POST',
      body: JSON.stringify({ month, eglise, amount })
    });
  }

  // ===== DÉPENSES =====
  async getDepenses(month, federation = null, district = null, eglise = null) {
    let url = `/depenses/${month}`;
    const params = new URLSearchParams();
    if (federation) params.append('federation', federation);
    if (district) params.append('district', district);
    if (eglise) params.append('eglise', eglise);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }

  async saveDepenses(data) {
    return this.request('/depenses/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== MEMBRES =====
  async getMembres() {
    return this.request('/membres');
  }

  async addMembre(data) {
    return this.request('/membres', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMembre(id, data) {
    return this.request(`/membres/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMembre(id) {
    return this.request(`/membres/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== MOIS =====
  async getMonths() {
    return this.request('/months');
  }

  async addMonth(id, name = null) {
    return this.request('/months', {
      method: 'POST',
      body: JSON.stringify({ id, name }),
    });
  }

  async deleteMonthData(month, eglise) {
    return this.request(`/months/${month}/eglise/${eglise}`, {
      method: 'DELETE',
    });
  }

  // ===== CONFIG =====
  async getChurchConfig() {
    return this.request('/config');
  }

  async saveChurchConfig(data) {
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== REPORTS =====
  async getMonthlyReport(month, eglise) {
    return this.request(`/reports/monthly/${month}/${eglise}`);
  }

  async rebuildMonthlyReport(month, eglise) {
    return this.request('/reports/rebuild', {
      method: 'POST',
      body: JSON.stringify({ month, eglise }),
    });
  }

  async updateSabbathDate(month, eglise, sabbathIndex, date) {
    return this.request('/reports/sabbath-date', {
      method: 'PUT',
      body: JSON.stringify({ month, eglise, sabbathIndex, date }),
    });
  }

  async updateReportField(month, eglise, field, value) {
    return this.request('/reports/field', {
      method: 'PUT',
      body: JSON.stringify({ month, eglise, field, value }),
    });
  }

  async getEgliseReports(eglise) {
    return this.request(`/reports/eglise/${eglise}`);
  }

  async getDistrictReports(district, year = null, month = null) {
    let url = `/reports/district/${district}`;
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }

  async getFederationReports(federation, year = null, month = null) {
    let url = `/reports/federation/${federation}`;
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }

  // ============================================================
  // ✅ MÉTHODES POUR VOLA SISA TEO ALOHA (alias)
  // ============================================================

  /**
   * Alias pour getVolaSisa - Récupère la valeur de volaSisaTeoAloha
   */
  async getVolaSisaTeoAloha(month, eglise) {
    return this.getVolaSisa(month, eglise);
  }

  /**
   * Alias pour saveVolaSisa - Sauvegarde la valeur de volaSisaTeoAloha
   */
  async saveVolaSisaTeoAloha(month, eglise, amount) {
    return this.saveVolaSisa(month, eglise, amount);
  }

  // ===== FRAIS =====
  async getFrais(month, eglise) {
    return this.request(`/frais/${month}/${eglise}`);
  }

  async saveFrais(month, eglise, frais) {
    return this.request('/frais', {
      method: 'POST',
      body: JSON.stringify({ month, eglise, frais }),
    });
  }

  // ===== STATS =====
  async getMembersStats() {
    return this.request('/stats/members');
  }

  // ===== LOGS =====
  async addLog(userId, userName, userFonction) {
    return this.request('/logs', {
      method: 'POST',
      body: JSON.stringify({ userId, userName, userFonction }),
    });
  }

  async getLogs(limit = 100, offset = 0) {
    return this.request(`/logs?limit=${limit}&offset=${offset}`);
  }

  async getUserLogs() {
    return this.getLogs(10000);
  }

  async getUniqueVisitorsCount() {
    const data = await this.request('/logs/unique');
    return data;
  }

  async getVisitsPerUser() {
    return this.request('/logs/visits');
  }

  // ===== EGLISES =====
  async getEglisesByDistrict(district) {
    return this.request(`/eglises/district/${district}`);
  }

  async getEglisesByFederation(federation) {
    return this.request(`/eglises/federation/${federation}`);
  }

  // ============================================================
  // ✅ MÉTHODES OPTIMISÉES (pour l'avenir)
  // ============================================================

  /**
   * Récupère toutes les données d'une année pour une église en 1 appel
   * ⚠️ Nécessite que le backend ait les fonctions getYearlyGLData etc.
   */
  async getYearlyData(year, eglise = null, district = null, federation = null) {
    let url = `/gl/yearly/${year}`;
    const params = new URLSearchParams();
    if (eglise) params.append('eglise', eglise);
    if (district) params.append('district', district);
    if (federation) params.append('federation', federation);
    if (params.toString()) url += '?' + params.toString();
    return this.request(url);
  }
}

const apiInstance = new ApiService();

export const api = apiInstance;
export const getAuthToken = () => apiInstance.getAuthToken();
export const setAuthToken = (token) => apiInstance.setAuthToken(token);