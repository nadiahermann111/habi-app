import { useState } from 'react';
import { authAPI, tokenUtils } from "C:\\Users\\nadula\\Pulpit\\habi-app\\frontend\\src\\services\\api.jsx";
import './Register.css';
const Register = ({ onRegisterSuccess, switchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    // Walidacja haseł
    if (formData.password !== formData.confirmPassword) {
      setError('Hasła nie są identyczne');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      setLoading(false);
      return;
    }

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.register(registerData);

      // Zapisz token
      tokenUtils.saveToken(response.token);

      // Wywołaj callback sukcesu
      onRegisterSuccess(response.user);

    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Rejestracja w Habi</h2>

        {error && <div className="error-message">{error}</div>}

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
              placeholder="Wprowadź nazwę użytkownika"
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
              placeholder="Wprowadź hasło (min. 6 znaków)"
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
              placeholder="Potwierdź hasło"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
          >
            {loading ? 'Rejestracja...' : 'Zarejestruj się'}
          </button>
        </form>

        <p className="switch-auth">
          Masz już konto?{' '}
          <button
            onClick={switchToLogin}
            className="link-button"
          >
            Zaloguj się
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;