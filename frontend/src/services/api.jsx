// frontend/src/services/api.jsx

// ZMIEŃ NA SWÓJ URL Z RENDER!
const API_BASE_URL = 'https://habi-backend.onrender.com';  // ← TWÓJ RENDER URL

// Token utilities
export const tokenUtils = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  isLoggedIn: () => !!localStorage.getItem('token'),
  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// API functions
export const authAPI = {
  async register(userData) {
    console.log('Sending registration data:', userData); // Debug

    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password
      }),
    });

    console.log('Registration response status:', response.status); // Debug

    if (!response.ok) {
      const error = await response.json();
      console.error('Registration error:', error); // Debug
      throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
  },

  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  },

  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  },

  async getCoins() {
    const response = await fetch(`${API_BASE_URL}/api/coins`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch coins');
    }

    return response.json();
  },

  async addCoins(amount) {
    const response = await fetch(`${API_BASE_URL}/api/coins/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      throw new Error('Failed to add coins');
    }

    return response.json();
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  }
};