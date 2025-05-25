import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "C:\\Users\\nadula\\Pulpit\\habi-app\\frontend\\src\\services\\api.jsx";

const Dashboard = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileData = await authAPI.getProfile();
      setProfile(profileData);
    } catch (err) {
      setError('Błąd pobierania profilu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    tokenUtils.removeToken();
    onLogout();
  };

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🐵 Witaj w Habi!</h1>
        <button onClick={handleLogout} className="logout-button">
          Wyloguj
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {profile && (
        <div className="profile-section">
          <div className="profile-card">
            <h2>Twój profil</h2>
            <div className="profile-info">
              <p><strong>Nazwa użytkownika:</strong> {profile.username}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>💰 Monety:</strong> {profile.coins}</p>
            </div>
          </div>

          <div className="habi-section">
            <div className="habi-card">
              <h3>Twoja małpka Habi</h3>
              <div className="habi-status">
                <div className="habi-avatar">🐵</div>
                <p>Czeka na implementację!</p>
                <p>Tutaj będzie status małpki, nawyki i więcej funkcji...</p>
              </div>
            </div>
          </div>

          <div className="quick-actions">
            <h3>Szybkie akcje</h3>
            <div className="action-buttons">
              <button className="action-btn">➕ Dodaj nawyk</button>
              <button className="action-btn">🍌 Nakarm Habi</button>
              <button className="action-btn">📊 Zobacz statystyki</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;