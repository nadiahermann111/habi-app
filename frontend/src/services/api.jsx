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

  // POPRAWKA: Dodaj metodę getUserCoins zgodną z HabitTracker
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
    return this.getUserCoins(); // Alias dla kompatybilności
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

  // POPRAWKA: Stwórz nowy nawyk z właściwym mapowaniem pól
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

  // POPRAWKA: Wykonaj nawyk z lepszą obsługą błędów
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

    // Upewnij się, że odpowiedź zawiera wszystkie potrzebne pola
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

  // POPRAWKA: Dodaj metodę getUserCoins dla kompatybilności z HabitTracker
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

  // NOWA FUNKCJA: Synchronizuj offline completions
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

    // Usuń zsynchronizowane completions
    const failedCompletions = results
      .filter(r => !r.success)
      .map(r => offlineCompletions.find(c => c.habitId === r.habitId))
      .filter(Boolean);

    localStorage.setItem('offline_completions', JSON.stringify(failedCompletions));

    return results;
  },

  // NOWA FUNKCJA: Sprawdź czy są offline changes do synchronizacji
  hasOfflineChanges() {
    const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
    const offlineCoins = localStorage.getItem('offline_coins');
    return offlineCompletions.length > 0 || offlineCoins !== null;
  }
};

// NOWE API dla karmienia Habi
export const feedAPI = {
  // Pobierz dostępne jedzenie
  async getFoods() {
    const response = await fetch(`${API_BASE_URL}/api/foods`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch foods');
    }

    return response.json();
  },

  // Kup jedzenie i nakarm Habi
  async feedHabi(foodId) {
    const response = await fetch(`${API_BASE_URL}/api/feed-habi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify({ food_id: foodId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to feed Habi');
    }

    return response.json();
  },

  // Pobierz aktualny stan Habi
  async getHabiStatus() {
    const response = await fetch(`${API_BASE_URL}/api/habi-status`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch Habi status');
    }

    return response.json();
  },

  // Pobierz historię karmienia
  async getFeedHistory() {
    const response = await fetch(`${API_BASE_URL}/api/feed-history`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch feed history');
    }

    return response.json();
  },

  // Synchronizuj offline purchases
  async syncOfflinePurchases() {
    const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
    const results = [];

    for (const purchase of offlinePurchases) {
      try {
        const result = await this.feedHabi(purchase.foodId);
        results.push({ success: true, foodId: purchase.foodId, result });
      } catch (error) {
        console.error(`Failed to sync purchase for food ${purchase.foodId}:`, error);
        results.push({ success: false, foodId: purchase.foodId, error: error.message });
      }
    }

    // Usuń zsynchronizowane purchases
    const failedPurchases = results
      .filter(r => !r.success)
      .map(r => offlinePurchases.find(p => p.foodId === r.foodId))
      .filter(Boolean);

    localStorage.setItem('offline_purchases', JSON.stringify(failedPurchases));

    return results;
  },

  // Sprawdź czy są offline changes
  hasOfflinePurchases() {
    const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
    return offlinePurchases.length > 0;
  }
};