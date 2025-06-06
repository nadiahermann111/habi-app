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

// FIXED: Dodaj funkcję do retry requests w przypadku problemów z CORS
const makeRequest = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors', // Wymuś CORS
        credentials: 'omit', // Nie wysyłaj cookies dla uproszczenia
      });
      return response;
    } catch (error) {
      console.warn(`Request attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      // Czekaj przed ponowną próbą
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};

// API functions
export const authAPI = {
  async register(userData) {
    console.log('Sending registration data:', userData);

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/register`, {
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

      console.log('Registration response status:', response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Registration failed' }));
        console.error('Registration error:', error);
        throw new Error(error.detail || 'Registration failed');
      }

      return response.json();
    } catch (error) {
      console.error('Registration request failed:', error);
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/login`, {
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
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        throw new Error(error.detail || 'Login failed');
      }

      return response.json();
    } catch (error) {
      console.error('Login request failed:', error);
      throw error;
    }
  },

  async getProfile() {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/profile`, {
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        // Jeśli 401, usuń token (expired/invalid)
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        throw new Error('Failed to fetch profile');
      }

      return response.json();
    } catch (error) {
      console.error('Get profile request failed:', error);
      throw error;
    }
  },

  async getCoins() {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/coins`, {
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        throw new Error('Failed to fetch coins');
      }

      return response.json();
    } catch (error) {
      console.error('Get coins request failed:', error);
      throw error;
    }
  },

  // FIXED: Popraw metodę dodawania monet
  async addCoins(amount) {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/coins/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
        body: JSON.stringify({ amount: amount }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        throw new Error('Failed to add coins');
      }

      return response.json();
    } catch (error) {
      console.error('Add coins request failed:', error);
      throw error;
    }
  },

  // Health check
  async healthCheck() {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/health`);
      return response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  // DODANE: Sprawdź czy token jest ważny
  async verifyToken() {
    try {
      const response = await makeRequest(`${API_BASE_URL}/api/verify-token`, {
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        tokenUtils.removeToken();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      tokenUtils.removeToken();
      return false;
    }
  }
};

// Habits API
export const habitsAPI = {
  async getHabits() {
    console.log('Fetching habits...');

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/habits`, {
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      console.log('Habits response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to fetch habits' }));
        console.error('Habits fetch error:', error);
        throw new Error(error.detail || 'Failed to fetch habits');
      }

      const data = await response.json();
      console.log('Habits data received:', data);
      return data;
    } catch (error) {
      console.error('Get habits request failed:', error);
      throw error;
    }
  },

  async createHabit(habitData) {
    console.log('Creating habit:', habitData);

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
        body: JSON.stringify({
          name: habitData.name,
          description: habitData.description || null,
          reward_coins: habitData.reward_coins || 1
        }),
      });

      console.log('Create habit response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to create habit' }));
        console.error('Create habit error:', error);
        throw new Error(error.detail || 'Failed to create habit');
      }

      const data = await response.json();
      console.log('Created habit:', data);
      return data;
    } catch (error) {
      console.error('Create habit request failed:', error);
      throw error;
    }
  },

  async completeHabit(habitId) {
    console.log('Completing habit:', habitId);

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      console.log('Complete habit response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to complete habit' }));
        console.error('Complete habit error:', error);

        // Utwórz obiekt error z response dla lepszego error handlingu
        const errorObj = new Error(error.detail || 'Failed to complete habit');
        errorObj.response = { status: response.status };
        throw errorObj;
      }

      const data = await response.json();
      console.log('Habit completed:', data);
      return data;
    } catch (error) {
      console.error('Complete habit request failed:', error);
      throw error;
    }
  },

  async deleteHabit(habitId) {
    console.log('Deleting habit:', habitId);

    try {
      const response = await makeRequest(`${API_BASE_URL}/api/habits/${habitId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...tokenUtils.getAuthHeaders(),
        },
      });

      console.log('Delete habit response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          tokenUtils.removeToken();
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to delete habit' }));
        console.error('Delete habit error:', error);
        throw new Error(error.detail || 'Failed to delete habit');
      }

      const data = await response.json();
      console.log('Habit deleted:', data);
      return data;
    } catch (error) {
      console.error('Delete habit request failed:', error);
      throw error;
    }
  }
};

// Export default dla kompatybilności
const api = {
  authAPI,
  habitsAPI,
  tokenUtils
};

export default api;