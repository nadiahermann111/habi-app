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
      console.log(' Rozpoczęcie procesu logowania...', { email: formData.email });

      console.log(' Czyszczenie starych danych sesji...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      console.log(' Stare dane sesji wyczyszczone');

      // Wywołanie API logowania
      const response = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('Logowanie udane:', response);

      // Zapisz nowe dane autoryzacji
      if (response.token && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        console.log(`Zapisano dane: ${response.user.username} (ID: ${response.user.id})`);

        // Wywołaj callback z danymi użytkownika
        if (onLoginSuccess) {
          console.log('Wywołanie onLoginSuccess z danymi:', response.user);
          onLoginSuccess(response.user);
        }
      } else {
        console.error(' Brak tokenu lub danych użytkownika w odpowiedzi');
        setError('Błąd logowania - niepełne dane z serwera');
      }

    } catch (err) {
      console.error(' Błąd logowania:', err);

      // Wyczyść dane w razie błędu
      localStorage.removeItem('token');
      localStorage.removeItem('user');

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
        </div>

        {error && (
          <div className="login-error-message">
            <span className="error-icon">❌</span>
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
      </div>
    </div>
  );
};

export default Login;