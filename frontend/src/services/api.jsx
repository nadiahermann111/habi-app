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

// Helper function for better error handling
const handleApiResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // Jeśli nie można sparsować JSON, użyj status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  return response.json();
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

    return handleApiResponse(response);
  },

  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    return handleApiResponse(response);
  },

  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return handleApiResponse(response);
  },

  async getUserCoins() {
    const response = await fetch(`${API_BASE_URL}/api/coins`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return handleApiResponse(response);
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

    return handleApiResponse(response);
  },

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      return handleApiResponse(response);
    } catch (error) {
      console.warn('Health check failed:', error);
      return { status: 'ERROR', error: error.message };
    }
  },

  // Aktualizuj monety użytkownika (po wykonaniu nawyku)
  async updateCoins(newAmount) {
    // Ta funkcja może być używana do synchronizacji stanu monet
    // bez wysyłania requestu - lokalnie aktualizujemy stan
    return { coins: newAmount };
  },

  // Dodaj funkcję do sprawdzania czy nawyk był już wykonany dzisiaj
  async checkTodayCompletion(habitId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const habits = await habitAPI.getHabits();
      const habit = habits.find(h => h.id === habitId);

      if (habit && habit.completion_dates) {
        return habit.completion_dates.includes(today);
      }

      return false;
    } catch (error) {
      console.error('Error checking today completion:', error);
      return false;
    }
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

    return handleApiResponse(response);
  },

  // Stwórz nowy nawyk z właściwym mapowaniem pól
  async createHabit(habitData) {
    // Mapuj coinValue na coin_value zgodnie z backend API
    const payload = {
      name: habitData.name,
      description: habitData.description,
      coin_value: habitData.coinValue || habitData.coin_value, // Obsłuż oba formaty
      icon: habitData.icon || '🎯'
    };

    const response = await fetch(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    return handleApiResponse(response);
  },

  // Wykonaj nawyk z lepszą obsługą błędów
  async completeHabit(habitId) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const result = await handleApiResponse(response);

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

  // Dodaj metodę getUserCoins dla kompatybilności z HabitTracker
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

    return handleApiResponse(response);
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

    return handleApiResponse(response);
  },

  // Usuń nawyk
  async deleteHabit(habitId) {
    const response = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return handleApiResponse(response);
  },

  // Pobierz statystyki nawyków
  async getHabitStats() {
    const response = await fetch(`${API_BASE_URL}/api/habits/stats`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return handleApiResponse(response);
  },

  // Synchronizuj offline completions
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

  // Sprawdź czy są offline changes do synchronizacji
  hasOfflineChanges() {
    const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
    const offlineCoins = localStorage.getItem('offline_coins');
    return offlineCompletions.length > 0 || offlineCoins !== null;
  }
};

// API dla karmienia Habi
export const feedAPI = {
  // Pobierz dostępne jedzenie
  async getFoods() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/foods`, {
        headers: {
          ...tokenUtils.getAuthHeaders(),
        },
      });

      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching foods:', error);

      // Fallback do cache jeśli API nie działa
      const cachedFoods = localStorage.getItem('foods_cache');
      if (cachedFoods) {
        console.log('Using cached foods data');
        return JSON.parse(cachedFoods);
      }

      // Ostatnia deska ratunku - hardcoded foods
      return [
        { id: 1, name: "Woda", cost: 1, nutrition: 5, iconImage: "🥤" },
        { id: 2, name: "Banan", cost: 3, nutrition: 15, iconImage: "🍌" },
        { id: 3, name: "Jabłko", cost: 3, nutrition: 15, iconImage: "🍎" },
        { id: 4, name: "Mięso", cost: 8, nutrition: 25, iconImage: "🥩" },
        { id: 5, name: "Sałatka", cost: 8, nutrition: 25, iconImage: "🥗" },
        { id: 6, name: "Kawa", cost: 20, nutrition: 40, iconImage: "☕" }
      ];
    }
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

    return handleApiResponse(response);
  },

  // Pobierz aktualny stan Habi
  async getHabiStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/habi-status`, {
        headers: {
          ...tokenUtils.getAuthHeaders(),
        },
      });

      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching Habi status:', error);

      // Fallback do localStorage
      const savedFoodLevel = localStorage.getItem('habiFoodLevel');
      const savedLastUpdate = localStorage.getItem('habiLastUpdate');

      return {
        food_level: savedFoodLevel ? parseInt(savedFoodLevel) : 100,
        last_update: savedLastUpdate || new Date().toISOString(),
        user_id: null
      };
    }
  },

  // Pobierz historię karmienia
  async getFeedHistory() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/feed-history`, {
        headers: {
          ...tokenUtils.getAuthHeaders(),
        },
      });

      return handleApiResponse(response);
    } catch (error) {
      console.error('Error fetching feed history:', error);
      return []; // Pusta historia jeśli błąd
    }
  },

  // Synchronizuj offline purchases
  async syncOfflinePurchases() {
    const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
    if (offlinePurchases.length === 0) {
      return [];
    }

    const results = [];

    for (const purchase of offlinePurchases) {
      try {
        const result = await this.feedHabi(purchase.foodId);
        results.push({ success: true, foodId: purchase.foodId, result });
        console.log(`Successfully synced purchase for food ${purchase.foodId}`);
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

    if (failedPurchases.length === 0) {
      console.log('All offline purchases synced successfully');
    } else {
      console.log(`${failedPurchases.length} purchases failed to sync`);
    }

    return results;
  },

  // Sprawdź czy są offline changes
  hasOfflinePurchases() {
    const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
    return offlinePurchases.length > 0;
  },

  // Test API connectivity
  async testConnection() {
    try {
      const health = await authAPI.healthCheck();
      return health.status === 'OK';
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
};