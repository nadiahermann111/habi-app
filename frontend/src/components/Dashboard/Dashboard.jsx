import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "../../services/api.jsx";
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

  // ============================================
  // EFFECTS
  // ============================================

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

  // ============================================
  // FETCH PROFILE
  // ============================================

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const profileData = await authAPI.getProfile();
      setProfile(profileData);
      console.log('✅ Profil załadowany:', profileData);
    } catch (err) {
      setError('Błąd pobierania profilu');
      console.error('❌ Błąd profilu:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // LOGOUT - PEŁNE CZYSZCZENIE
  // ============================================

  const handleLogout = () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚪 ROZPOCZĘCIE WYLOGOWANIA');

    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log(`   👤 Wylogowywanie: ${user.username} (ID: ${user.id})`);
      }
    } catch (e) {
      console.warn('   ⚠️ Błąd parsowania user data');
    }

    // 1. Wyczyść dane ubrań
    console.log('   🗑️ Czyszczenie danych ubrań...');
    clearClothingOnLogout();

    // 2. Wyczyść WSZYSTKIE dane z localStorage
    console.log('   🗑️ Czyszczenie localStorage...');
    const keysToKeep = ['slotMachine_cleaned_v5']; // Zachowaj tylko migration flag
    const allKeys = Object.keys(localStorage);

    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        console.log(`      ✓ Usunięto: ${key}`);
      }
    });

    // 3. Zresetuj stan komponentu
    console.log('   🔄 Resetowanie stanu Dashboard...');
    setProfile(null);
    setCurrentView('dashboard');
    setIsSlotMachineOpen(false);
    setCurrentClothing(null);
    setError('');

    // 4. Wywołaj callback wylogowania
    console.log('   📤 Wywołanie onLogout...');
    onLogout();

    console.log('✅ WYLOGOWANIE ZAKOŃCZONE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  // ============================================
  // DEV FUNCTIONS
  // ============================================

  const handleAddTestCoins = async () => {
    try {
      const result = await authAPI.addCoins(10);
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));
      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: result.coins }
      }));
      alert(`${result.message}! Masz teraz ${result.coins} monet.`);
    } catch (error) {
      console.error('❌ Błąd dodawania monet:', error);
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
      console.error('❌ Error reducing Habi happiness:', error);
    }
  };

  // ============================================
  // COINS HANDLING
  // ============================================

  const handleCoinsUpdate = (newCoinsAmount) => {
    console.log(`💰 handleCoinsUpdate: ${profile?.coins} → ${newCoinsAmount}`);
    setProfile(prev => ({
      ...prev,
      coins: newCoinsAmount
    }));
  };

  const handleWinCoins = async (amount) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎰 handleWinCoins START');
    console.log(`   User ID: ${profile?.id}`);
    console.log(`   Amount to add: ${amount}`);
    console.log(`   Current coins: ${profile?.coins}`);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('❌ Brak tokenu w localStorage');
        throw new Error('Brak tokenu autoryzacji');
      }

      console.log('📤 Wysyłanie requestu do /api/coins/add');

      const response = await fetch('https://habi-backend.onrender.com/api/coins/add', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: amount })
      });

      console.log(`📥 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Response data:', result);

      // Aktualizuj stan
      console.log(`🔄 Aktualizacja stanu: ${profile?.coins} → ${result.coins}`);
      setProfile(prev => ({
        ...prev,
        coins: result.coins
      }));

      // Event
      console.log('📡 Wysyłanie eventu coinsUpdated');
      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: result.coins }
      }));

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ handleWinCoins SUCCESS');
      console.log(`   New total: ${result.coins} monet`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ handleWinCoins ERROR');
      console.error('   Error:', error.message);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      alert('Nie udało się dodać wygranych monet. Spróbuj ponownie później.');
      throw error;
    }
  };

  // ============================================
  // CLOTHING
  // ============================================

  const handleClothingChange = (clothingId) => {
    console.log('👗 Zmiana ubrania na ID:', clothingId);
    setCurrentClothing(clothingId);
    clothingStorage.save(clothingId);

    window.dispatchEvent(new CustomEvent('clothingChanged', {
      detail: { clothingId }
    }));
  };

  // ============================================
  // NAVIGATION
  // ============================================

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

  // ============================================
  // RENDERING
  // ============================================

  if (loading) {
    return <div className="loading">Ładowanie profilu...</div>;
  }

  if (currentView === 'stats') {
    return (
      <HabitStats
        onBack={handleBackToDashboard}
      />
    );
  }

  if (currentView === 'habits') {
    return (
      <HabitTracker
        onBack={handleBackToDashboard}
        initialCoins={profile?.coins || 0}
        onCoinsUpdate={handleCoinsUpdate}
      />
    );
  }

  if (currentView === 'feed') {
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