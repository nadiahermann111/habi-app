import { useState } from 'react';
import { authAPI, tokenUtils } from "../../services/api.jsx";
import './Login.css';

const Login = ({ onLoginSuccess, switchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Starting login process...', formData);

      // Call the login API
      const response = await authAPI.login(formData);

      console.log('Login successful:', response);

      // Store the token using the correct function name
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
      // Handle error properly - fetch API throws Error objects, not axios-style responses
      setError(err.message || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Logowanie do Habi</h2>

        {error && <div className="login-error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Wprowadź swój email"
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Wprowadź hasło"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <p className="login-switch-auth">
          Nie masz konta?{' '}
          <button
            onClick={switchToRegister}
            className="login-link-button"
            disabled={loading}
          >
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;