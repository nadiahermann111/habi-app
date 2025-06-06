import { useState } from 'react';
import { authAPI, tokenUtils } from '../../services/api.jsx';
import './Login.css';

const Login = ({ onLoginSuccess, switchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Wyczyść błąd gdy użytkownik zaczyna pisać
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email jest wymagany');
      return false;
    }

    if (!formData.password) {
      setError('Hasło jest wymagane');
      return false;
    }

    // Prosta walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Nieprawidłowy format email');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Starting login process...', { email: formData.email });

      // Call the login API
      const response = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('Login successful:', response);

      // Store the token
      if (response.token) {
        tokenUtils.setToken(response.token);
        console.log('Token stored successfully');
      }

      // Call the success callback with user data
      if (onLoginSuccess && response.user) {
        console.log('Calling onLoginSuccess with user data:', response.user);
        onLoginSuccess(response.user);
      } else {
        console.error('Missing onLoginSuccess callback or user data');
      }

    } catch (err) {
      console.error('Login failed:', err);

      // Obsługa różnych typów błędów
      if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Sprawdź czy backend działa.');
      } else if (err.message.includes('401') || err.message.includes('Nieprawidłowy email lub hasło')) {
        setError('Nieprawidłowy email lub hasło');
      } else if (err.message.includes('500')) {
        setError('Błąd serwera. Spróbuj ponownie za chwilę.');
      } else {
        setError(err.message || 'Błąd podczas logowania');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Zaloguj się do Habi</h2>
          <p>Witaj ponownie! Zaloguj się do swojego konta.</p>
        </div>

        {error && (
          <div className="login-error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="twoj@email.com"
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Hasło</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Twoje hasło"
              required
              disabled={loading}
              autoComplete="current-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.email.trim() || !formData.password}
            className="login-button"
          >
            {loading ? (
              <>
                <span className="loading-spinner">⏳</span>
                Logowanie...
              </>
            ) : (
              'Zaloguj się'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-switch-auth">
            Nie masz konta?{' '}
            <button
              type="button"
              onClick={switchToRegister}
              className="login-link-button"
              disabled={loading}
            >
              Zarejestruj się
            </button>
          </p>
        </div>

        {/* Debug info - usuń w produkcji */}
        <div className="debug-info">
          <small>
            Status: {navigator.onLine ? 'Online' : 'Offline'} |
            Backend: {import.meta.env.VITE_API_URL || 'https://habi-backend.onrender.com'}
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;