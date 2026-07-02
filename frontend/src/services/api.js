// ⚠️ URL forcée pour la production (Render)
const API_URL = 'https://rapfi-backend.onrender.com/api';

console.log('🚀 API_URL =', API_URL);

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.onUnauthorized = null;
  }

  setOnUnauthorized(callback) {
    this.onUnauthorized = callback;
  }

  getAuthToken() {
    return this.token || null;
  }

  setAuthToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    console.log(`📤 Requête vers ${url}`);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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

  // ✅ Correction : accepter FormData directement
  async uploadPhoto(id, formData) {
    const url = `${API_URL}/users/${id}/photo`;
    console.log(`📤 Upload photo vers ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
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

  async getUniqueVisitors() {
    return this.request('/logs/unique');
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
}

const apiInstance = new ApiService();

export const api = apiInstance;
export const getAuthToken = () => apiInstance.getAuthToken();
export const setAuthToken = (token) => apiInstance.setAuthToken(token);