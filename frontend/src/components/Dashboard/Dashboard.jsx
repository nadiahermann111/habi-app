import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "C:\\Users\\nadula\\Pulpit\\habi-app\\frontend\\src\\services\\api.jsx";
import MenuHeader from '../MenuHeader/MenuHeader';
import './Dashboard.css';

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

  const handleAddTestCoins = async () => {
    try {
      const result = await authAPI.addCoins(10);

      // Zaktualizuj lokalny stan profilu
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));

      // Wyślij event żeby MenuHeader się odświeżył
      window.dispatchEvent(new CustomEvent('coinsUpdated'));

      alert(`${result.message}! Masz teraz ${result.coins} monet.`);
    } catch (error) {
      alert('Błąd dodawania monet');
    }
  };

  const handleCoinsUpdate = (newCoinsAmount) => {
    // Callback z MenuHeader - aktualizuj lokalny stan
    setProfile(prev => ({
      ...prev,
      coins: newCoinsAmount
    }));
  };

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  return (
    <div className="dashboard">
      <MenuHeader
        onLogout={handleLogout}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />

      {error && <div className="error-message">{error}</div>}

      {profile && (
        <div className="profile-section">
          {/* Powitanie użytkownika */}
          <div className="welcome-section">
            <h1 className="welcome-message">Cześć {profile.username}! 👋</h1>
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
              <button className="action-btn" onClick={handleAddTestCoins}>
                🪙 Dodaj 10 monet (test)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;