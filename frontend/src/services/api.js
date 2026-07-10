// frontend/src/services/api.js
const API_URL = 'https://rapfi-backend.onrender.com/api';

console.log('🚀 API_URL =', API_URL);

// 🔥 SYSTÈME DE CACHE
const requestCache = new Map();
const CACHE_TTL = 30000;

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

  // 🔥 MÉTHODE AVEC CACHE
  async requestWithCache(endpoint, options = {}, ttl = CACHE_TTL) {
    const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
    const now = Date.now();
    
    if (requestCache.has(cacheKey)) {
      const cached = requestCache.get(cacheKey);
      if (now - cached.timestamp < ttl) {
        console.log(`🔄 Cache hit pour ${endpoint}`);
        return cached.data;
      }
      requestCache.delete(cacheKey);
    }

    const data = await this.request(endpoint, options);
    requestCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  clearCache() {
    requestCache.clear();
    console.log('🧹 Cache vidé');
  }

  clearCacheFor(endpoint) {
    for (const key of requestCache.keys()) {
      if (key.startsWith(endpoint)) {
        requestCache.delete(key);
      }
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

    const config = { ...options, headers };

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
      headers: { 'Authorization': `Bearer ${this.token}` },
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
    return this.requestWithCache(url);
  }

  async saveGL(data) {
    this.clearCacheFor('/gl/');
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
    return this.requestWithCache(url);
  }

  async saveDepenses(data) {
    this.clearCacheFor('/depenses/');
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
    return this.requestWithCache('/months');
  }

  async addMonth(id, name = null) {
    this.clearCacheFor('/months');
    return this.request('/months', {
      method: 'POST',
      body: JSON.stringify({ id, name }),
    });
  }

  async deleteMonthData(month, eglise) {
    this.clearCache();
    return this.request(`/months/${month}/eglise/${eglise}`, {
      method: 'DELETE',
    });
  }

  // ===== CONFIG =====
  async getChurchConfig() {
    return this.requestWithCache('/config');
  }

  async saveChurchConfig(data) {
    this.clearCacheFor('/config');
    return this.request('/config', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== REPORTS =====
  async getMonthlyReport(month, eglise) {
    return this.requestWithCache(`/reports/monthly/${month}/${eglise}`);
  }

  async rebuildMonthlyReport(month, eglise) {
    this.clearCacheFor('/reports/');
    return this.request('/reports/rebuild', {
      method: 'POST',
      body: JSON.stringify({ month, eglise }),
    });
  }

  async updateSabbathDate(month, eglise, sabbathIndex, date) {
    this.clearCacheFor('/reports/');
    return this.request('/reports/sabbath-date', {
      method: 'PUT',
      body: JSON.stringify({ month, eglise, sabbathIndex, date }),
    });
  }

  async updateReportField(month, eglise, field, value) {
    this.clearCacheFor('/reports/');
    return this.request('/reports/field', {
      method: 'PUT',
      body: JSON.stringify({ month, eglise, field, value }),
    });
  }

  async getEgliseReports(eglise) {
    return this.requestWithCache(`/reports/eglise/${eglise}`);
  }

  async getDistrictReports(district, year = null, month = null) {
    let url = `/reports/district/${district}`;
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (params.toString()) url += '?' + params.toString();
    return this.requestWithCache(url);
  }

  async getFederationReports(federation, year = null, month = null) {
    let url = `/reports/federation/${federation}`;
    const params = new URLSearchParams();
    if (year) params.append('year', year);
    if (month) params.append('month', month);
    if (params.toString()) url += '?' + params.toString();
    return this.requestWithCache(url);
  }

  // ===== FRAIS =====
  async getFrais(month, eglise) {
    return this.requestWithCache(`/frais/${month}/${eglise}`);
  }

  async saveFrais(month, eglise, frais) {
    this.clearCacheFor('/frais/');
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
    return this.request('/logs/unique');
  }

  async getVisitsPerUser() {
    return this.request('/logs/visits');
  }

  // ===== EGLISES =====
  async getEglisesByDistrict(district) {
    return this.requestWithCache(`/eglises/district/${district}`);
  }

  async getEglisesByFederation(federation) {
    return this.requestWithCache(`/eglises/federation/${federation}`);
  }
}

const apiInstance = new ApiService();

export const api = apiInstance;
export const getAuthToken = () => apiInstance.getAuthToken();
export const setAuthToken = (token) => apiInstance.setAuthToken(token);