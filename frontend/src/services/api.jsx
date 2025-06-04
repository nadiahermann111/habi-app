const API_BASE_URL = 'https://habi-backend.onrender.com';  // ← TWÓJ RENDER URL

// Helper function for making requests with better error handling
const makeRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const finalOptions = { ...defaultOptions, ...options };

  console.log(`Making request to: ${url}`);
  console.log('Request options:', finalOptions);

  try {
    const response = await fetch(url, finalOptions);
    console.log(`Response status: ${response.status}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error('Error response:', errorMessage);
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);

    // Check if it's a network error
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.');
    }

    throw error;
  }
};

// Token utilities
export const tokenUtils = {
  getToken: () => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token from localStorage:', error);
      return null;
    }
  },

  setToken: (token) => {
    try {
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error setting token in localStorage:', error);
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Error removing token from localStorage:', error);
    }
  },

  isLoggedIn: () => {
    const token = tokenUtils.getToken();
    return !!token;
  },

  getAuthHeaders: () => {
    const token = tokenUtils.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
};

// Authentication API
export const authAPI = {
  async register(userData) {
    console.log('Sending registration data:', {
      username: userData.username,
      email: userData.email
    }); // Don't log password

    const response = await makeRequest(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      body: JSON.stringify({
        username: userData.username,
        email: userData.email,
        password: userData.password
      }),
    });

    const data = await response.json();
    console.log('Registration successful');
    return data;
  },

  async login(credentials) {
    console.log('Sending login data:', { email: credentials.email }); // Don't log password

    const response = await makeRequest(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      }),
    });

    const data = await response.json();
    console.log('Login successful');
    return data;
  },

  async getProfile() {
    console.log('Fetching user profile...');

    const response = await makeRequest(`${API_BASE_URL}/api/profile`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Profile data received');
    return data;
  },

  async getCoins() {
    console.log('Fetching user coins...');

    const response = await makeRequest(`${API_BASE_URL}/api/coins`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Coins data received:', data);
    return data;
  },

  async addCoins(amount) {
    console.log('Adding coins:', amount);

    if (!amount || amount <= 0) {
      throw new Error('Kwota musi być większa od 0');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/coins/add?amount=${amount}`, {
      method: 'POST',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Coins added successfully:', data);
    return data;
  },

  // Health check
  async healthCheck() {
    console.log('Checking backend health...');

    const response = await makeRequest(`${API_BASE_URL}/api/health`);
    const data = await response.json();
    console.log('Health check result:', data);
    return data;
  },

  // Test database connection
  async testDatabase() {
    console.log('Testing database connection...');

    const response = await makeRequest(`${API_BASE_URL}/api/test-db`);
    const data = await response.json();
    console.log('Database test result:', data);
    return data;
  }
};

// Habits API
export const habitsAPI = {
  async getHabits() {
    console.log('Fetching habits...');

    const response = await makeRequest(`${API_BASE_URL}/api/habits`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Habits data received:', data);

    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.error('Expected array of habits, got:', typeof data);
      return [];
    }

    return data;
  },

  async createHabit(habitData) {
    console.log('Creating habit:', habitData);

    // Validate habit data
    if (!habitData.name || !habitData.name.trim()) {
      throw new Error('Nazwa nawyku jest wymagana');
    }

    if (habitData.reward_coins && (habitData.reward_coins < 1 || habitData.reward_coins > 10)) {
      throw new Error('Nagroda musi być między 1 a 10 monetami');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify({
        name: habitData.name.trim(),
        description: habitData.description ? habitData.description.trim() : null,
        reward_coins: habitData.reward_coins || 1
      }),
    });

    const data = await response.json();
    console.log('Created habit:', data);
    return data;
  },

  async completeHabit(habitId) {
    console.log('Completing habit:', habitId);

    if (!habitId) {
      throw new Error('ID nawyku jest wymagane');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/habits/${habitId}/complete`, {
      method: 'POST',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Habit completed:', data);
    return data;
  },

  async deleteHabit(habitId) {
    console.log('Deleting habit:', habitId);

    if (!habitId) {
      throw new Error('ID nawyku jest wymagane');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: 'DELETE',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Habit deleted:', data);
    return data;
  }
};

// Users API (for admin purposes)
export const usersAPI = {
  async getAllUsers() {
    console.log('Fetching all users...');

    const response = await makeRequest(`${API_BASE_URL}/api/users`, {
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
    });

    const data = await response.json();
    console.log('Users data received:', data);
    return data;
  }
};

// Utility functions
export const apiUtils = {
  // Check if backend is accessible
  async checkBackendStatus() {
    try {
      await authAPI.healthCheck();
      return { status: 'online', message: 'Backend jest dostępny' };
    } catch (error) {
      return { status: 'offline', message: `Backend niedostępny: ${error.message}` };
    }
  },

  // Check if user is authenticated
  async checkAuthentication() {
    if (!tokenUtils.isLoggedIn()) {
      return { authenticated: false, message: 'Brak tokenu autoryzacji' };
    }

    try {
      await authAPI.getProfile();
      return { authenticated: true, message: 'Użytkownik zalogowany' };
    } catch (error) {
      // Token might be expired or invalid
      tokenUtils.removeToken();
      return { authenticated: false, message: 'Token wygasł lub jest nieprawidłowy' };
    }
  },

  // Format error message for user display
  formatErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      // Common API error messages translation
      const translations = {
        'Failed to fetch': 'Nie można połączyć się z serwerem',
        'Network request failed': 'Błąd połączenia sieciowego',
        'Unauthorized': 'Brak autoryzacji',
        'Forbidden': 'Brak uprawnień',
        'Not Found': 'Nie znaleziono',
        'Internal Server Error': 'Błąd serwera'
      };

      return translations[error.message] || error.message;
    }

    return 'Wystąpił nieoczekiwany błąd';
  }
};

// Export all APIs as default object
const api = {
  authAPI,
  habitsAPI,
  usersAPI,
  tokenUtils,
  apiUtils
};

export default api;

// Named exports for convenience
export {
  authAPI as auth,
  habitsAPI as habits,
  usersAPI as users,
  tokenUtils as tokens,
  apiUtils as utils
};