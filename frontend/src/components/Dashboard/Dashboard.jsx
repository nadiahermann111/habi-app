import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "../../services/api.jsx";
import MenuHeader from '../MenuHeader/MenuHeader';
import HabitTracker from '../HabitTracker/HabitTracker.jsx';
import FeedHabi from '../FeedHabi/FeedHabi.jsx';
import DressHabi from '../DressHabi/DressHabi.jsx';
import HabiSection from '../HabiSection/HabiSection';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');

  // Pobranie profilu użytkownika przy pierwszym załadowaniu komponentu
  useEffect(() => {
    fetchProfile();
  }, []);

  // Funkcja pobierająca dane profilu użytkownika z serwera
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

  // Obsługa wylogowania użytkownika
  const handleLogout = () => {
    tokenUtils.removeToken();
    onLogout();
  };

  // Funkcja testowa do dodawania monet (tylko w trybie deweloperskim)
  const handleAddTestCoins = async () => {
    try {
      const result = await authAPI.addCoins(10);

      // Aktualizacja lokalnego stanu profilu z nową liczbą monet
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));

      // Wysłanie globalnego eventu o zmianie liczby monet
      window.dispatchEvent(new CustomEvent('coinsUpdated'));

      alert(`${result.message}! Masz teraz ${result.coins} monet.`);
    } catch (error) {
      alert('Błąd dodawania monet');
    }
  };

  // Funkcja testowa do zmniejszania szczęścia Habi (tylko w trybie deweloperskim)
  const handleReduceHabiHappiness = () => {
    try {
      // Pobranie aktualnego poziomu sytości z pamięci lokalnej
      const currentFoodLevel = localStorage.getItem('habiFoodLevel');
      const currentLevel = currentFoodLevel ? parseInt(currentFoodLevel) : 75;

      // Obliczenie redukcji (10% poziomu, minimum 5, maksimum 25 punktów)
      const reductionAmount = Math.max(5, Math.min(25, Math.floor(currentLevel * 0.1)));
      const newLevel = Math.max(0, currentLevel - reductionAmount);

      // Zapisanie nowego poziomu i czasu aktualizacji
      const currentTime = Date.now();
      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());

      // Wysłanie eventu o zmianie poziomu sytości Habi
      window.dispatchEvent(new CustomEvent('habiFoodLevelChanged', {
        detail: { newLevel, reductionAmount }
      }));

      alert(`Habi stracił ${reductionAmount}% szczęścia! 😢 Poziom sytości: ${newLevel}%`);
    } catch (error) {
      alert('Błąd zmiany poziomu szczęścia Habi');
      console.error('Error reducing Habi happiness:', error);
    }
  };

  // Callback wywoływany przy aktualizacji liczby monet
  const handleCoinsUpdate = (newCoinsAmount) => {
    setProfile(prev => ({
      ...prev,
      coins: newCoinsAmount
    }));
  };

  // Funkcje nawigacji między różnymi widokami aplikacji
  const handleNavigateToHabits = () => {
    setCurrentView('habits');
  };

  const handleNavigateToFeed = () => {
    setCurrentView('feed');
  };

  const handleNavigateToDress = () => {
    setCurrentView('dress');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // Wyświetlenie ekranu ładowania podczas pobierania danych
  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  // Renderowanie widoku trackera nawyków
  if (currentView === 'habits') {
    return (
      <HabitTracker
        onBack={handleBackToDashboard}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  // Renderowanie widoku karmienia Habi
  if (currentView === 'feed') {
    return (
      <FeedHabi
        onBack={handleBackToDashboard}
        userCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  // Renderowanie widoku ubierania Habi
  if (currentView === 'dress') {
    return (
      <DressHabi
        onBack={handleBackToDashboard}
        userCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  // Renderowanie głównego widoku Dashboard
  return (
    <div className="dashboard">
      {/* Nagłówek z menu i informacjami o monetach */}
      <MenuHeader
        onLogout={handleLogout}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />

      {/* Wyświetlenie komunikatu błędu jeśli wystąpił */}
      {error && <div className="error-message">{error}</div>}

      {profile && (
        <div className="profile-section">
          {/* Sekcja powitalna z imieniem użytkownika */}
          <div className="welcome-section">
            <h1 className="welcome-message">Cześć {profile.username}! 👋</h1>
          </div>

          {/* Komponent wyświetlający wirtualnego zwierzaka Habi */}
          <HabiSection />

          {/* Sekcja z przyciskami szybkich akcji */}
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
              <button className="action-btn" onClick={handleNavigateToDress}>
                👗 Personalizuj Habi
              </button>
            </div>
          </div>

          {/* Przyciski deweloperskie widoczne tylko w trybie development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="dev-actions">
              <button className="dev-btn" onClick={handleAddTestCoins}>
                🪙 Dodaj 10 monet (DEV)
              </button>
              <button className="dev-btn" onClick={handleReduceHabiHappiness}>
                😢 Usuń % najedzenia Habi (DEV)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
