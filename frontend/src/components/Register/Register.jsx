import { useState } from 'react';
import { authAPI, tokenUtils } from '../../services/api.jsx';
import './Register.css';

function Register({ onRegisterSuccess, switchToLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Wyczyść błąd gdy użytkownik zaczyna pisać
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Nazwa użytkownika jest wymagana');
      return false;
    }

    if (formData.username.trim().length < 3) {
      setError('Nazwa użytkownika musi mieć co najmniej 3 znaki');
      return false;
    }

    if (formData.username.trim().length > 50) {
      setError('Nazwa użytkownika może mieć maksymalnie 50 znaków');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email jest wymagany');
      return false;
    }

    // Walidacja email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Nieprawidłowy format email');
      return false;
    }

    if (!formData.password) {
      setError('Hasło jest wymagane');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('Starting registration process...');

      // Call the registration API
      const response = await authAPI.register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      console.log('Registration successful:', response);

      // Store the token
      if (response.token) {
        tokenUtils.setToken(response.token);
        console.log('Token stored successfully');
      }

      // Call the success callback with user data
      if (onRegisterSuccess && response.user) {
        console.log('Calling onRegisterSuccess with user data:', response.user);
        onRegisterSuccess(response.user);
      } else {
        console.error('Missing onRegisterSuccess callback or user data');
      }

    } catch (error) {
      console.error('Registration failed:', error);

      // Obsługa różnych typów błędów
      if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Sprawdź czy backend działa.');
      } else if (error.message.includes('Email już jest zajęty')) {
        setError('Ten email jest już zarejestrowany');
      } else if (error.message.includes('Username już jest zajęty')) {
        setError('Ta nazwa użytkownika jest już zajęta');
      } else if (error.message.includes('500')) {
        setError('Błąd serwera. Spróbuj ponownie za chwilę.');
      } else {
        setError(error.message || 'Rejestracja nie powiodła się');
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'medium';
    if (password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) return 'strong';
    return 'medium';
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="register-container">
      <div className="register-form">
        <div className="register-header">
          <h2>Rejestracja</h2>
          <p>Utwórz konto i zacznij śledzić swoje nawyki!</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="TwojaNazwa"
              required
              disabled={loading}
              autoComplete="username"
              autoFocus
              minLength={3}
              maxLength={50}
            />
            <small className="field-hint">
              Od 3 do 50 znaków
            </small>
          </div>

          <div className="form-group">
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 znaków"
              required
              disabled={loading}
              autoComplete="new-password"
              minLength={6}
            />
            {formData.password && (
              <div className={`password-strength ${passwordStrength}`}>
                <div className="strength-bar">
                  <div className="strength-fill"></div>
                </div>
                <small>
                  Siła hasła: {
                    passwordStrength === 'weak' ? 'Słabe' :
                    passwordStrength === 'medium' ? 'Średnie' :
                    passwordStrength === 'strong' ? 'Mocne' : ''
                  }
                </small>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Potwierdź hasło</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Powtórz hasło"
              required
              disabled={loading}
              autoComplete="new-password"
              minLength={6}
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <small className="error-hint">Hasła nie są identyczne</small>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
              <small className="success-hint">✓ Hasła są identyczne</small>
            )}
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              !formData.username.trim() ||
              !formData.email.trim() ||
              !formData.password ||
              !formData.confirmPassword ||
              formData.password !== formData.confirmPassword ||
              formData.password.length < 6
            }
            className="register-button"
          >
            {loading ? (
              <>
                <span className="loading-spinner">⏳</span>
                Rejestrowanie...
              </>
            ) : (
              'Zarejestruj się'
            )}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Masz już konto?{' '}
            <button
              type="button"
              onClick={switchToLogin}
              disabled={loading}
              className="link-button"
            >
              Zaloguj się
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
}

export default Register;