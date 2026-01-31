const API_BASE_URL = 'https://habi-backend.onrender.com';

// ============================================
// Utility do zarządzania tokenami
// ============================================
export const tokenUtils = {
  getToken: () => localStorage.getItem('token'),

  setToken: (token) => {
    localStorage.setItem('token', token);
    console.log('Token zapisany');
  },

  removeToken: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('habits_cache');
    localStorage.removeItem('offline_completions');
    localStorage.removeItem('offline_coins');
    console.log('Token i cache usunięte');
  },

  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  // Sprawdź czy token istnieje
  hasToken: () => {
    return !!tokenUtils.getToken();
  }
};

// ============================================
// Globalny handler błędów 401 (Unauthorized)
// ============================================
const handleUnauthorized = () => {
  console.error('Sesja wygasła lub token nieprawidłowy');

  // Usuń wszystkie dane
  tokenUtils.removeToken();

  // Wyślij event dla innych komponentów
  window.dispatchEvent(new CustomEvent('unauthorized', {
    detail: { message: 'Sesja wygasła. Zaloguj się ponownie.' }
  }));

  // Przekieruj na stronę logowania po krótkiej chwili
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
};

// ============================================
// Helper do wykonywania requestów z obsługą błędów
// ============================================
const fetchWithAuth = async (url, options = {}) => {
  try {
    // Sprawdź czy mamy token przed requestem
    if (!tokenUtils.hasToken() && options.requireAuth !== false) {
      throw new Error('Brak tokenu autoryzacji');
    }

    const response = await fetch(url, options);

    // Obsłuż błąd 401 (Unauthorized)
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }

    // Obsłuż inne błędy HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error ${response.status}`);
    }

    return response;

  } catch (error) {
    // Jeśli to błąd sieciowy (offline)
    if (error.message === 'Failed to fetch' || error.message.includes('NetworkError')) {
      throw new Error('OFFLINE');
    }
    throw error;
  }
};

// ============================================
// API Autentykacji
// ============================================
export const authAPI = {
  async register(userData) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      requireAuth: false, // Rejestracja nie wymaga tokenu
    });

    const data = await response.json();

    // Zapisz token po udanej rejestracji
    if (data.token) {
      tokenUtils.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  },

  async login(credentials) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
      requireAuth: false, // Logowanie nie wymaga tokenu
    });

    const data = await response.json();

    // Zapisz token po udanym logowaniu
    if (data.token) {
      tokenUtils.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('Zalogowano pomyślnie');
    }

    return data;
  },

  async getProfile() {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/profile`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  async getUserCoins() {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/coins`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  async getCoins() {
    return this.getUserCoins();
  },

  async addCoins(amount) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/coins/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify({ amount }),
    });

    return response.json();
  },

  // Sprawdź czy token jest ważny
  async verifyToken() {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      if (error.message.includes('Sesja wygasła')) {
        return false;
      }
      // Inne błędy (np. sieciowe) nie oznaczają nieważnego tokenu
      return null; // null = nie można sprawdzić
    }
  },

  // Health check (nie wymaga autoryzacji)
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  },

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
  },

  // Wyloguj użytkownika
  logout() {
    tokenUtils.removeToken();
    window.location.href = '/login';
  }
};

// ============================================
// API Nawyków
// ============================================
export const habitAPI = {
  // Pobierz wszystkie nawyki użytkownika
  async getHabits() {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  async createHabit(habitData) {
    // Mapuj coinValue na coin_value zgodnie z backend API
    const payload = {
      name: habitData.name,
      description: habitData.description,
      coin_value: habitData.coinValue || habitData.coin_value,
      icon: habitData.icon
    };

    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  },

  async completeHabit(habitId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
    });

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
    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits/${habitId}`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  // Zaktualizuj nawyk
  async updateHabit(habitId, habitData) {
    const payload = { ...habitData };
    if (payload.coinValue) {
      payload.coin_value = payload.coinValue;
      delete payload.coinValue;
    }

    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    return response.json();
  },

  // Usuń nawyk
  async deleteHabit(habitId) {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  // Pobierz statystyki nawyków
  async getHabitStats() {
    const response = await fetchWithAuth(`${API_BASE_URL}/api/habits/stats`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    return response.json();
  },

  // Synchronizuj offline completion
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

    // Zachowaj tylko te, które się nie udały
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

// ============================================
// Cache Manager - lepsze zarządzanie cache
// ============================================
export const cacheManager = {
  // Zapisz dane z timestampem
  save(key, data, expiresInDays = 7) {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  },

  // Pobierz dane z cache jeśli nie wygasły
  get(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      // Sprawdź czy nie wygasł
      if (Date.now() > cacheData.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error(`Błąd odczytu cache ${key}:`, error);
      return null;
    }
  },

  // Usuń konkretny klucz
  remove(key) {
    localStorage.removeItem(key);
  },

  // Wyczyść cały cache (oprócz tokenu i usera)
  clearAll() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    localStorage.clear();

    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', user);
  }
};