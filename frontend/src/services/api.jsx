// frontend/src/services/api.jsx

const API_BASE_URL = 'https://habi-backend.onrender.com';

// Token utilities
export const tokenUtils = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// API functions
export const authAPI = {
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
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
      body: JSON.stringify(credentials),
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
  },

  // Aktualizuj monety użytkownika (po wykonaniu nawyku)
  async updateCoins(newAmount) {
    // Ta funkcja może być używana do synchronizacji stanu monet
    // bez wysyłania requestu - lokalnie aktualizujemy stan
    return { coins: newAmount };
  },

  // Dodaj funkcję do sprawdzania czy nawyk był już wykonany dzisiaj
  async checkTodayCompletion(habitId) {
    const today = new Date().toISOString().split('T')[0];
    const habits = await habitAPI.getHabits();
    const habit = habits.find(h => h.id === habitId);

    if (habit && habit.completion_dates) {
      return habit.completion_dates.includes(today);
    }

    return false;
  }
};

export const habitAPI = {
  // Pobierz wszystkie nawyki użytkownika
  async getHabits() {
    const response = await fetch(`${API_BASE_URL}/api/habits`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch habits');
    }

    return response.json();
  },

  // Stwórz nowy nawyk
  async createHabit(habitData) {
    const response = await fetch(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify({
        name: habitData.name,
        description: habitData.description,
        coinValue: habitData.coinValue,
        icon: habitData.icon
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create habit');
    }

    return response.json();
  },

  // Wykonaj nawyk
  async completeHabit(habitId) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to complete habit');
    }

    return response.json();
  },

  // Pobierz szczegóły nawyku
  async getHabit(habitId) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch habit');
    }

    return response.json();
  },

  // Zaktualizuj nawyk
  async updateHabit(habitId, habitData) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(habitData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to update habit');
    }

    return response.json();
  },

  // Usuń nawyk
  async deleteHabit(habitId) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to delete habit');
    }

    return response.json();
  },

  // Pobierz statystyki nawyków
  async getHabitStats() {
    const response = await fetch(`${API_BASE_URL}/api/habits/stats`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch habit stats');
    }

    return response.json();
  }
};