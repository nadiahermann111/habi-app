import { useState } from 'react';
import { authAPI, tokenUtils } from '../../services/api.jsx';
import './Register.css';

function Register({ onRegisterSuccess, switchToLogin }) {
  // Stan przechowujący dane formularza rejestracji
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  // Stan informujący o trwającym procesie rejestracji
  const [loading, setLoading] = useState(false);
  // Stan przechowujący komunikaty błędów
  const [error, setError] = useState('');

  // Funkcja obsługująca zmiany w polach formularza
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Funkcja obsługująca wysłanie formularza rejestracji
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Walidacja - sprawdzenie czy hasła są identyczne
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting registration process...');

      // Wywołanie API rejestracji z danymi użytkownika
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password
      });

      console.log('Registration successful:', response);

      // Zapisanie tokenu autoryzacji w pamięci lokalnej
      if (response.token) {
        tokenUtils.setToken(response.token);
        console.log('Token stored successfully');
      }

      // Wywołanie callback funkcji z danymi nowo zarejestrowanego użytkownika
      if (onRegisterSuccess && response.user) {
        console.log('Calling onRegisterSuccess with user data:', response.user);
        onRegisterSuccess(response.user);
      } else {
        console.error('Missing onRegisterSuccess callback or user data');
      }

    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.message || 'Rejestracja nie powiodła się');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h2>Rejestracja</h2>

        <form onSubmit={handleSubmit}>
          {/* Pole wprowadzania nazwy użytkownika */}
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          {/* Pole wprowadzania adresu email */}
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          {/* Pole wprowadzania hasła */}
          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          {/* Pole potwierdzenia hasła */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Potwierdź hasło:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          {/* Wyświetlenie komunikatu błędu jeśli wystąpił */}
          {error && <div className="error-message">{error}</div>}

          {/* Przycisk wysłania formularza */}
          <button type="submit" disabled={loading}>
            {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>

        {/* Link do przełączenia na formularz logowania */}
        <p>
          Masz już konto?{' '}
          <button type="button" onClick={switchToLogin} disabled={loading}>
            Zaloguj się
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;