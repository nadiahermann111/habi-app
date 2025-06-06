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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      setLoading(false);
      return;
    }

    try {
      console.log('Starting registration process...');

      // Call the registration API
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
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

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>

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