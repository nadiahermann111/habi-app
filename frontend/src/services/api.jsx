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
    const response = await fetch(`${API_BASE_URL}/api/coins/add?amount=${amount}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
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

// Habits API
export const habitsAPI = {
  async getHabits() {
    console.log('Fetching habits...'); // Debug

    const response = await fetch(`${API_BASE_URL}/api/habits`, {
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

    console.log('Habits response status:', response.status); // Debug

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch habits' }));
      console.error('Habits fetch error:', error); // Debug
      throw new Error(error.detail || 'Failed to fetch habits');
    }

    const data = await response.json();
    console.log('Habits data received:', data); // Debug
    return data;
  },

  async createHabit(habitData) {
    console.log('Creating habit:', habitData); // Debug

    const response = await fetch(`${API_BASE_URL}/api/habits`, {
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

    console.log('Create habit response status:', response.status); // Debug

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create habit' }));
      console.error('Create habit error:', error); // Debug
      throw new Error(error.detail || 'Failed to create habit');
    }

    const data = await response.json();
    console.log('Created habit:', data); // Debug
    return data;
  },

  async completeHabit(habitId) {
    console.log('Completing habit:', habitId); // Debug

    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

    console.log('Complete habit response status:', response.status); // Debug

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to complete habit' }));
      console.error('Complete habit error:', error); // Debug

      // Utwórz obiekt error z response dla lepszego error handlingu
      const errorObj = new Error(error.detail || 'Failed to complete habit');
      errorObj.response = { status: response.status };
      throw errorObj;
    }

    const data = await response.json();
    console.log('Habit completed:', data); // Debug
    return data;
  },

  async deleteHabit(habitId) {
    console.log('Deleting habit:', habitId); // Debug

    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

    console.log('Delete habit response status:', response.status); // Debug

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to delete habit' }));
      console.error('Delete habit error:', error); // Debug
      throw new Error(error.detail || 'Failed to delete habit');
    }

    const data = await response.json();
    console.log('Habit deleted:', data); // Debug
    return data;
  }
};

// Export default dla kompatybilności
const api = {
  authAPI,
  habitsAPI,
  tokenUtils
};

export default api;