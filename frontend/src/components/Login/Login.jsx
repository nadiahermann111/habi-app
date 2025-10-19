
import { useState } from 'react';
import { authAPI, tokenUtils } from '../../services/api.jsx';
import './Login.css';

const Login = ({ onLoginSuccess, switchToRegister }) => {
  // Stan przechowujący dane formularza logowania
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  // Stan informujący o trwającym procesie logowania
  const [loading, setLoading] = useState(false);
  // Stan przechowujący komunikaty błędów
  const [error, setError] = useState('');

  // Funkcja obsługująca zmiany w polach formularza
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Wyczyszczenie błędu gdy użytkownik zaczyna wpisywać dane
    if (error) setError('');
  };

  // Funkcja walidująca poprawność danych w formularzu
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email jest wymagany');
      return false;
    }

    if (!formData.password) {
      setError('Hasło jest wymagane');
      return false;
    }

    // Podstawowa walidacja formatu adresu email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Nieprawidłowy format email');
      return false;
    }

    return true;
  };

  // Funkcja obsługująca wysłanie formularza logowania
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Starting login process...', { email: formData.email });

      // Wywołanie API logowania z danymi użytkownika
      const response = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('Login successful:', response);

      // Zapisanie tokenu autoryzacji w pamięci lokalnej
      if (response.token) {
        tokenUtils.setToken(response.token);
        console.log('Token stored successfully');
      }

      // Wywołanie callback funkcji z danymi zalogowanego użytkownika
      if (onLoginSuccess && response.user) {
        console.log('Calling onLoginSuccess with user data:', response.user);
        onLoginSuccess(response.user);
      } else {
        console.error('Missing onLoginSuccess callback or user data');
      }

    } catch (err) {
      console.error('Login failed:', err);

      // Obsługa różnych typów błędów z odpowiednimi komunikatami
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
        {/* Nagłówek formularza logowania */}
        <div className="login-header">
          <h2>Zaloguj się do Habi</h2>
        </div>

        {/* Wyświetlenie komunikatu błędu jeśli wystąpił */}
        {error && (
          <div className="login-error-message">
            <span className="error-icon">❌</span>
            <span>{error}</span>
          </div>
        )}

        {/* Formularz logowania */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* Pole wprowadzania adresu email */}
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

          {/* Pole wprowadzania hasła */}
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

          {/* Przycisk wysłania formularza */}
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

        {/* Stopka z linkiem do rejestracji */}
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
      </div>
    </div>
  );
};

export default Login;