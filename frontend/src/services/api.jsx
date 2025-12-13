const API_BASE_URL = 'https://habi-backend.onrender.com';

// ========================================
// TOKEN UTILS
// ========================================

export const tokenUtils = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
      console.log('✅ Token zapisany:', token.substring(0, 20) + '...');
    }
  },
  removeToken: () => {
    localStorage.removeItem('token');
    console.log('🗑️ Token usunięty');
  },
  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    if (token) {
      console.log('🔑 Dodaję token do headera');
      return { 'Authorization': `Bearer ${token}` };
    }
    console.warn('⚠️ Brak tokenu!');
    return {};
  }
};

// ========================================
// REFRESH TOKEN LOGIC
// ========================================

let isRefreshing = false;
let refreshPromise = null;

const refreshAccessToken = async () => {
  console.log('🔄 Próba odświeżenia tokenu...');

  if (isRefreshing) {
    console.log('⏳ Już odświeżam, czekam...');
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = fetch(`${API_BASE_URL}/api/refresh`, {
    method: 'POST',
    credentials: 'include', // ⚠️ WAŻNE - wysyła cookies
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        console.error('❌ Refresh failed:', response.status);
        throw new Error('Refresh failed');
      }
      const data = await response.json();
      if (data.access_token) {
        console.log('✅ Nowy token otrzymany');
        tokenUtils.setToken(data.access_token);
        return data.access_token;
      }
      throw new Error('No access token in response');
    })
    .catch((error) => {
      console.error('❌ Błąd odświeżania:', error);
      throw error;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
};

// ========================================
// AUTHENTICATED FETCH - z automatycznym odświeżaniem
// ========================================

const authenticatedFetch = async (url, options = {}) => {
  console.log(`📡 Request do: ${url}`);

  // Przygotuj headery z tokenem
  const token = tokenUtils.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('🔑 Token dodany do requesta');
  } else {
    console.warn('⚠️ Brak tokenu w localStorage');
  }

  // Wykonaj request
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // ⚠️ WAŻNE - wysyła cookies
    headers,
  });

  console.log(`📥 Response status: ${response.status}`);

  // Jeśli 401 (Unauthorized), spróbuj odświeżyć token
  if (response.status === 401 && !options._retry) {
    console.log('🔄 401 otrzymane, próba odświeżenia tokenu...');

    try {
      const newToken = await refreshAccessToken();

      if (newToken) {
        console.log('✅ Token odświeżony, powtarzam request...');

        // Powtórz request z nowym tokenem
        const newHeaders = {
          'Content-Type': 'application/json',
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        };

        response = await fetch(url, {
          ...options,
          credentials: 'include',
          headers: newHeaders,
          _retry: true
        });

        console.log(`📥 Ponowny response status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Refresh token wygasł, wylogowanie');
      tokenUtils.removeToken();
      throw new Error('Session expired');
    }
  }

  return response;
};

// ========================================
// AUTH API
// ========================================

export const authAPI = {
  async register(userData) {
    console.log('📝 Rejestracja użytkownika...');

    const response = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      credentials: 'include', // ⚠️ WAŻNE
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const data = await response.json();
    console.log('✅ Rejestracja udana:', data);

    // Zapisz token
    if (data.token) {
      tokenUtils.setToken(data.token);
    }

    return data;
  },

  async login(credentials) {
    console.log('🔐 Logowanie użytkownika...');

    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      credentials: 'include', // ⚠️ WAŻNE
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    console.log('✅ Logowanie udane:', data);

    // Zapisz token
    if (data.token) {
      tokenUtils.setToken(data.token);
    }

    return data;
  },

  async logout() {
    console.log('👋 Wylogowywanie...');

    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenUtils.removeToken();
    }
  },

  async getProfile() {
    console.log('👤 Pobieranie profilu...');
    const response = await authenticatedFetch(`${API_BASE_URL}/api/profile`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to fetch profile');
    }

    const data = await response.json();
    console.log('✅ Profil pobrany:', data);
    return data;
  },

  // ✅ Odśwież sesję z cookies
  async refreshSession() {
    console.log('🔄 Odświeżanie sesji...');

    try {
      const newToken = await refreshAccessToken();
      return !!newToken;
    } catch (error) {
      console.error('❌ Błąd odświeżania sesji:', error);
      return false;
    }
  },

  async getUserCoins() {
    console.log('💰 Pobieranie monet...');
    const response = await authenticatedFetch(`${API_BASE_URL}/api/coins`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to fetch coins');
    }

    return response.json();
  },

  async getCoins() {
    return this.getUserCoins();
  },

  async addCoins(amount) {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/coins/add`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to add coins');
    }

    return response.json();
  },

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
  }
};

// ========================================
// HABIT API
// ========================================

export const habitAPI = {
  async getHabits() {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch habits');
    }

    return response.json();
  },

  async createHabit(habitData) {
    const payload = {
      name: habitData.name,
      description: habitData.description,
      coin_value: habitData.coinValue || habitData.coin_value,
      icon: habitData.icon
    };

    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create habit');
    }

    return response.json();
  },

  async completeHabit(habitId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to complete habit');
    }

    const result = await response.json();

    if (!result.total_coins && result.coins_earned) {
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

  async getHabit(habitId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits/${habitId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch habit');
    }

    return response.json();
  },

  async updateHabit(habitId, habitData) {
    const payload = { ...habitData };
    if (payload.coinValue) {
      payload.coin_value = payload.coinValue;
      delete payload.coinValue;
    }

    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to update habit');
    }

    return response.json();
  },

  async deleteHabit(habitId) {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to delete habit');
    }

    return response.json();
  },

  async getHabitStats() {
    const response = await authenticatedFetch(`${API_BASE_URL}/api/habits/stats`);

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