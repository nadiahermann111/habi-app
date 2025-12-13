const API_BASE_URL = 'https://habi-backend.onrender.com';

export const tokenUtils = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

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

  async getUserCoins() {
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

  async getCoins() {
    return this.getUserCoins();
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
    return { coins: newAmount };
  },

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

  async createHabit(habitData) {
    // Mapuj coinValue na coin_value zgodnie z backend API
    const payload = {
      name: habitData.name,
      description: habitData.description,
      coin_value: habitData.coinValue || habitData.coin_value, // Obsłuż oba formaty
      icon: habitData.icon
    };

    const response = await fetch(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create habit');
    }

    return response.json();
  },

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

    const result = await response.json();

    if (!result.total_coins && result.coins_earned) {
      // Fallback - pobierz aktualne monety jeśli total_coins nie jest w odpowiedzi
      try {
        const coinsResponse = await authAPI.getUserCoins();
        result.total_coins = coinsResponse.coins;
      } catch (error) {
        console.warn('Could not fetch updated coins:', error);
      }
    }

    return result;
  },

  async getUserCoins() {
    return authAPI.getUserCoins();
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
    // Mapuj pola jeśli potrzeba
    const payload = { ...habitData };
    if (payload.coinValue) {
      payload.coin_value = payload.coinValue;
      delete payload.coinValue;
    }

    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
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
  },

  async syncOfflineCompletions() {
    const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
    const results = [];

    for (const completion of offlineCompletions) {
      try {
        const result = await this.completeHabit(completion.habitId);
        results.push({ success: true, habitId: completion.habitId, result });
      } catch (error) {
        console.error(`Failed to sync completion for habit ${completion.habitId}:`, error);
        results.push({ success: false, habitId: completion.habitId, error: error.message });
      }
    }

    const failedCompletions = results
      .filter(r => !r.success)
      .map(r => offlineCompletions.find(c => c.habitId === r.habitId))
      .filter(Boolean);

    localStorage.setItem('offline_completions', JSON.stringify(failedCompletions));

    return results;
  },

  hasOfflineChanges() {
    const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
    const offlineCoins = localStorage.getItem('offline_coins');
    return offlineCompletions.length > 0 || offlineCoins !== null;
  }
};