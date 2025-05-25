import { useState } from 'react';
import { authAPI, tokenUtils } from "C:\\Users\\nadula\\Pulpit\\habi-app\\frontend\\src\\services\\api.jsx";

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
      const response = await authAPI.login(formData);

      // Zapisz token
      tokenUtils.saveToken(response.token);

      // Wywołaj callback sukcesu
      onLoginSuccess(response.user);

    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Logowanie do Habi</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Wprowadź swój email"
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
              placeholder="Wprowadź hasło"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>

        <p className="switch-auth">
          Nie masz konta?{' '}
          <button
            onClick={switchToRegister}
            className="link-button"
          >
            Zarejestruj się
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;