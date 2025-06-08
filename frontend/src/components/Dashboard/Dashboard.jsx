import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "../../services/api.jsx";
import MenuHeader from '../MenuHeader/MenuHeader';
import HabitTracker from '../HabitTracker/HabitTracker.jsx';
import FeedHabi from '../FeedHabi/FeedHabi.jsx';
import HabiSection from '../HabiSection/HabiSection';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'habits', or 'feed'

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

  const handleReduceHabiHappiness = () => {
    try {
      // Pobierz aktualny poziom sytości z localStorage
      const currentFoodLevel = localStorage.getItem('habiFoodLevel');
      const currentLevel = currentFoodLevel ? parseInt(currentFoodLevel) : 75;

      // Zmniejsz o 10% (minimum 5 punktów, maksimum 25 punktów)
      const reductionAmount = Math.max(5, Math.min(25, Math.floor(currentLevel * 0.1)));
      const newLevel = Math.max(0, currentLevel - reductionAmount);

      // Zaktualizuj localStorage
      const currentTime = Date.now();
      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());

      // Wyślij event do FoodControl żeby się odświeżył
      window.dispatchEvent(new CustomEvent('habiFoodLevelChanged', {
        detail: { newLevel, reductionAmount }
      }));

      alert(`Habi stracił ${reductionAmount}% szczęścia! 😢 Poziom sytości: ${newLevel}%`);
    } catch (error) {
      alert('Błąd zmiany poziomu szczęścia Habi');
      console.error('Error reducing Habi happiness:', error);
    }
  };

  const handleCoinsUpdate = (newCoinsAmount) => {
    // Callback z MenuHeader - aktualizuj lokalny stan
    setProfile(prev => ({
      ...prev,
      coins: newCoinsAmount
    }));
  };

  const handleNavigateToHabits = () => {
    setCurrentView('habits');
  };

  const handleNavigateToFeed = () => {
    setCurrentView('feed');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  // Render HabitTracker jeśli wybrano ten widok
  if (currentView === 'habits') {
    return (
      <HabitTracker
        onBack={handleBackToDashboard}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  // Render FeedHabi jeśli wybrano ten widok
  if (currentView === 'feed') {
    return (
      <FeedHabi
        onBack={handleBackToDashboard}
        userCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  // Render głównego Dashboard
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

          <HabiSection />

          <div className="quick-actions">
            <h3>Szybkie akcje</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={handleNavigateToHabits}>
                ➕ Dodaj nawyk
              </button>
              <button className="action-btn" onClick={handleNavigateToFeed}>
                🍌 Nakarm Habi
              </button>
              <button className="action-btn">
                📊 Zobacz statystyki
              </button>
              <button className="action-btn">
                Personalizuj Habi
              </button>
            </div>
          </div>

          {/* Opcjonalnie: dodaj test button dla dodawania monet */}
          {process.env.NODE_ENV === 'development' && (
            <div className="dev-actions">
              <button className="dev-btn" onClick={handleAddTestCoins}>
                🪙 Dodaj 10 monet (DEV)
              </button>
              <button className="dev-btn" onClick={handleReduceHabiHappiness}>
                😢 Usuń 10% szczęścia Habi (DEV)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;