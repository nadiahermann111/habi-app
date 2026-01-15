import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "../../services/api.jsx";
import { clearAllAuthData } from '../../utils/auth';
import MenuHeader from '../MenuHeader/MenuHeader';
import HabitTracker from '../HabitTracker/HabitTracker.jsx';
import HabitStats from '../HabitStats/HabitStats.jsx';
import FeedHabi from '../FeedHabi/FeedHabi.jsx';
import DressHabi from '../DressHabi/DressHabi.jsx';
import HabiSection from '../HabiSection/HabiSection';
import SlotMachine from '../SlotMachine/SlotMachine.jsx';
import { clothingStorage, clearClothingOnLogout } from '../../utils/clothingHelper';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSlotMachineOpen, setIsSlotMachineOpen] = useState(false);
  const [currentClothing, setCurrentClothing] = useState(null);

  // Wczytaj obecnie założone ubranie przy montowaniu
  useEffect(() => {
    const savedClothing = clothingStorage.load();
    if (savedClothing) {
      console.log('👗 Wczytano ubranie z localStorage:', savedClothing);
      setCurrentClothing(savedClothing);
    }
  }, []);

  useEffect(() => {
    console.log('📍 Current view changed to:', currentView);
  }, [currentView]);

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

  // ✅ POPRAWIONA funkcja wylogowania
  const handleLogout = () => {
    console.log('🚪 Rozpoczęcie procesu wylogowania...');

    // Wyczyść dane ubrań
    clearClothingOnLogout();

    // ✅ Wyczyść WSZYSTKIE dane autoryzacji (token, user, etc.)
    clearAllAuthData();

    // Wywołaj callback wylogowania z App.jsx
    onLogout();

    console.log('✅ Wylogowanie zakończone');
  };

  const handleAddTestCoins = async () => {
    try {
      const result = await authAPI.addCoins(10);
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));
      window.dispatchEvent(new CustomEvent('coinsUpdated'));
      alert(`${result.message}! Masz teraz ${result.coins} monet.`);
    } catch (error) {
      alert('Błąd dodawania monet');
    }
  };

  const handleReduceHabiHappiness = () => {
    try {
      const currentFoodLevel = localStorage.getItem('habiFoodLevel');
      const currentLevel = currentFoodLevel ? parseInt(currentFoodLevel) : 75;
      const reductionAmount = Math.max(5, Math.min(25, Math.floor(currentLevel * 0.1)));
      const newLevel = Math.max(0, currentLevel - reductionAmount);
      const currentTime = Date.now();

      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());

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
    setProfile(prev => ({
      ...prev,
      coins: newCoinsAmount
    }));
  };

  const handleClothingChange = (clothingId) => {
    console.log('👗 Zmiana ubrania na ID:', clothingId);
    setCurrentClothing(clothingId);
    clothingStorage.save(clothingId);

    window.dispatchEvent(new CustomEvent('clothingChanged', {
      detail: { clothingId }
    }));
  };

  const handleWinCoins = async (amount) => {
    try {
      const result = await authAPI.addCoins(amount);
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));
      window.dispatchEvent(new CustomEvent('coinsUpdated'));
      console.log(`🎉 Wygrałeś ${amount} monet! Nowy stan: ${result.coins}`);
    } catch (error) {
      console.error('Błąd dodawania wygranych monet:', error);
      alert('Nie udało się dodać wygranych monet. Spróbuj ponownie.');
    }
  };

  const handleNavigateToHabits = () => {
    console.log('🎯 Navigating to habits');
    setCurrentView('habits');
  };

  const handleNavigateToStats = () => {
    console.log('📊 Navigating to stats');
    setCurrentView('stats');
  };

  const handleNavigateToFeed = () => {
    console.log('🍌 Navigating to feed');
    setCurrentView('feed');
  };

  const handleNavigateToDress = () => {
    console.log('👗 Navigating to dress');
    setCurrentView('dress');
  };

  const handleOpenFortuneWheel = () => {
    console.log('🎰 Opening slot machine');
    setIsSlotMachineOpen(true);
  };

  const handleCloseFortuneWheel = () => {
    console.log('🎰 Closing slot machine');
    setIsSlotMachineOpen(false);
  };

  const handleBackToDashboard = () => {
    console.log('🏠 Navigating back to dashboard');
    setCurrentView('dashboard');
  };

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  if (currentView === 'stats') {
    console.log('✅ Rendering HabitStats component');
    return (
      <HabitStats
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'habits') {
    console.log('✅ Rendering HabitTracker component');
    return (
      <HabitTracker
        onBack={handleBackToDashboard}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  if (currentView === 'feed') {
    console.log('✅ Rendering FeedHabi component');
    return (
      <FeedHabi
        onBack={handleBackToDashboard}
        userCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
        currentClothing={currentClothing}
      />
    );
  }

  if (currentView === 'dress') {
    console.log('✅ Rendering DressHabi component');
    return (
      <DressHabi
        onBack={handleBackToDashboard}
        userCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
        currentClothing={currentClothing}
        onClothingChange={handleClothingChange}
      />
    );
  }

  console.log('✅ Rendering main Dashboard');
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
          <div className="welcome-section">
            <h1 className="welcome-message">Cześć {profile.username}! 👋</h1>
          </div>

          <HabiSection currentClothing={currentClothing} />

          <div className="quick-actions">
            <h3>Szybkie akcje</h3>
            <div className="action-buttons">
              <button className="action-btn" onClick={handleNavigateToHabits}>
                ➕ Dodaj nawyk
              </button>
              <button className="action-btn" onClick={handleNavigateToFeed}>
                🍌 Nakarm Habi
              </button>
              <button className="action-btn" onClick={handleNavigateToStats}>
                📊 Zobacz statystyki
              </button>
              <button className="action-btn" onClick={handleNavigateToDress}>
                👗 Personalizuj Habi
              </button>
              <button className="action-btn fortune-btn" onClick={handleOpenFortuneWheel}>
                🎰 Automat z owocami
              </button>
            </div>
          </div>

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

      <SlotMachine
        isOpen={isSlotMachineOpen}
        onClose={handleCloseFortuneWheel}
        onWinCoins={handleWinCoins}
        userCoins={profile?.coins || 0}
        userId={profile?.id}
        username={profile?.username}
      />
    </div>
  );
};

export default Dashboard;