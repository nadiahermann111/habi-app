import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Konfiguracja axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor do automatycznego dodawania tokenu
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API funkcje
export const authAPI = {
  // Rejestracja
  register: async (userData) => {
    const response = await api.post('/api/register', userData);
    return response.data;
  },

  // Logowanie
  login: async (credentials) => {
    const response = await api.post('/api/login', credentials);
    return response.data;
  },

  // Pobierz profil
  getProfile: async () => {
    const response = await api.get('/api/profile');
    return response.data;
  },

  // Test połączenia
  healthCheck: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Pobierz monety
  getCoins: async () => {
    const response = await api.get('/api/coins');
    return response.data;
  },

  // Dodaj monety (dla testów)
  addCoins: async (amount) => {
    const response = await api.post(`/api/coins/add?amount=${amount}`);
    return response.data;
  },
};

// Funkcje pomocnicze dla tokenu
export const tokenUtils = {
  saveToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  getToken: () => {
    return localStorage.getItem('authToken');
  },

  removeToken: () => {
    localStorage.removeItem('authToken');
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('authToken');
  },
};

export default api;