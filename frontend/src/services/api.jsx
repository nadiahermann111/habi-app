const API_BASE_URL = 'https://habi-backend.onrender.com';

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
        console.log('Full error response:', errorData);

        // Handle Pydantic validation errors (array format)
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map(err => {
            const field = err.loc ? err.loc.join('.') : 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } else if (errorData.detail) {
          // Handle FastAPI HTTPException detail
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map(err => {
              const field = err.loc ? err.loc.join('.') : 'field';
              return `${field}: ${err.msg}`;
            }).join(', ');
          } else {
            errorMessage = errorData.detail;
          }
        } else {
          errorMessage = errorData.message || `HTTP ${response.status}`;
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
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

    // Validate registration data
    if (!userData.username || !userData.username.trim()) {
      throw new Error('Nazwa użytkownika jest wymagana');
    }
    if (!userData.email || !userData.email.trim()) {
      throw new Error('Email jest wymagany');
    }
    if (!userData.password || userData.password.length < 6) {
      throw new Error('Hasło musi mieć co najmniej 6 znaków');
    }

    const requestData = {
      username: userData.username.trim(),
      email: userData.email.trim(),
      password: userData.password
    };

    const response = await makeRequest(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    console.log('Registration successful');
    return data;
  },

  async login(credentials) {
    console.log('Sending login data:', { email: credentials.email }); // Don't log password

    // Validate login data
    if (!credentials.email || !credentials.email.trim()) {
      throw new Error('Email jest wymagany');
    }
    if (!credentials.password) {
      throw new Error('Hasło jest wymagane');
    }

    const requestData = {
      email: credentials.email.trim(),
      password: credentials.password
    };

    const response = await makeRequest(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    console.log('Login successful');
    return data;
  },

  async getProfile() {
    console.log('Fetching user profile...');

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

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

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

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

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

    if (!amount || amount <= 0) {
      throw new Error('Kwota musi być większa od 0');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/coins/add?amount=${encodeURIComponent(amount)}`, {
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

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

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
    console.log('Creating habit with data:', habitData);

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

    // Validate habit data on frontend
    if (!habitData.name || !habitData.name.trim()) {
      throw new Error('Nazwa nawyku jest wymagana');
    }

    if (habitData.name.trim().length > 100) {
      throw new Error('Nazwa nawyku nie może być dłuższa niż 100 znaków');
    }

    // Prepare clean request data
    const requestData = {
      name: habitData.name.trim()
    };

    // Only add description if it's provided and not empty
    if (habitData.description && typeof habitData.description === 'string' && habitData.description.trim()) {
      if (habitData.description.trim().length > 500) {
        throw new Error('Opis nawyku nie może być dłuższy niż 500 znaków');
      }
      requestData.description = habitData.description.trim();
    }

    // Handle reward_coins
    if (habitData.reward_coins !== undefined && habitData.reward_coins !== null) {
      const coins = parseInt(habitData.reward_coins, 10);
      if (isNaN(coins) || coins < 1 || coins > 10) {
        throw new Error('Nagroda musi być liczbą między 1 a 10');
      }
      requestData.reward_coins = coins;
    } else {
      requestData.reward_coins = 1; // Default value
    }

    console.log('Sending clean habit data:', requestData);

    const response = await makeRequest(`${API_BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        ...tokenUtils.getAuthHeaders(),
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    console.log('Created habit:', data);
    return data;
  },

  async completeHabit(habitId) {
    console.log('Completing habit:', habitId);

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

    if (!habitId || habitId <= 0) {
      throw new Error('Nieprawidłowe ID nawyku');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/habits/${encodeURIComponent(habitId)}/complete`, {
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

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

    if (!habitId || habitId <= 0) {
      throw new Error('Nieprawidłowe ID nawyku');
    }

    const response = await makeRequest(`${API_BASE_URL}/api/habits/${encodeURIComponent(habitId)}`, {
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

    if (!tokenUtils.isLoggedIn()) {
      throw new Error('Brak tokenu autoryzacji');
    }

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
        'Internal Server Error': 'Błąd serwera',
        'Bad Request': 'Nieprawidłowe żądanie',
        'Unprocessable Entity': 'Nieprawidłowe dane'
      };

      return translations[error.message] || error.message;
    }

    return 'Wystąpił nieoczekiwany błąd';
  },

  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate username format
  isValidUsername(username) {
    return username &&
           typeof username === 'string' &&
           username.trim().length >= 3 &&
           username.trim().length <= 50 &&
           /^[a-zA-Z0-9_-]+$/.test(username.trim());
  },

  // Sanitize text input
  sanitizeText(text, maxLength = 255) {
    if (!text || typeof text !== 'string') return '';
    return text.trim().slice(0, maxLength);
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