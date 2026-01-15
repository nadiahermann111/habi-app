import React, { useState, useEffect } from 'react';
import { habitAPI, authAPI, tokenUtils, cacheManager } from '../../services/api.jsx';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png';
import './HabitTracker.css';

// ============================================
// Komponent powiadomień wewnątrz aplikacji
// ============================================
const NotificationContainer = ({ notifications, onRemove }) => {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
          onRemove={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
};

const Notification = ({ id, type, title, message, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Automatyczne usunięcie powiadomienia po 2 sekundach
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onRemove, 300); // Czas na animację wyjścia
    }, 2000);

    return () => clearTimeout(timer);
  }, [onRemove]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  return (
    <div className={`notification ${type} ${isExiting ? 'exit' : ''}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        {title && <div className="notification-title">{title}</div>}
        <div className="notification-message">{message}</div>
      </div>
    </div>
  );
};

// ============================================
// Główny komponent HabitTracker
// ============================================
const HabitTracker = ({ onBack, initialCoins = 0, onCoinsUpdate }) => {
  // Stan określający aktualny widok ('list' - lista nawyków, 'add' - formularz dodawania)
  const [currentView, setCurrentView] = useState('list');
  // Stan przechowujący listę wszystkich nawyków użytkownika
  const [habits, setHabits] = useState([]);
  // Stan przechowujący aktualną liczbę monet użytkownika
  const [userCoins, setUserCoins] = useState(initialCoins);
  // Set przechowujący ID nawyków wykonanych dzisiaj
  const [completedToday, setCompletedToday] = useState(new Set());
  // Stan informujący o trwających operacjach
  const [loading, setLoading] = useState(false);
  // Stan przechowujący komunikaty błędów
  const [error, setError] = useState('');
  // Stan informujący o statusie połączenia internetowego
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Stan przechowujący aktywne powiadomienia
  const [notifications, setNotifications] = useState([]);

  // Obiekt przechowujący dane nowego nawyku podczas dodawania
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    coinValue: 3,
    icon: '🎯'
  });

  // Tablica dostępnych ikon do wyboru dla nawyków
  const availableIcons = ['🎯', '💪', '📚', '🏃', '💧', '🧘', '🎵', '🎨', '🍎', '😴'];

  // Definicja limitów nawyków według ich wartości w monetach
  const HABIT_LIMITS = {
    5: 1,   // maksymalnie 1 nawyk za 5 monet
    4: 2,   // maksymalnie 2 nawyki za 4 monety
    3: 3,   // maksymalnie 3 nawyki za 3 monety
    2: 4,   // maksymalnie 4 nawyki za 2 monety
    1: -1   // bez limitu dla nawyków za 1 monetę (-1 = bez limitu)
  };

  // ============================================
  // Funkcja do wyświetlania powiadomień
  // ============================================
  const showNotification = (type, message, title = '') => {
    const id = Date.now() + Math.random();
    const notification = { id, type, title, message };

    setNotifications(prev => [...prev, notification]);
  };

  // Funkcja do usuwania powiadomienia
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // ============================================
  // Funkcje sprawdzające limity nawyków
  // ============================================
  const canAddHabit = (coinValue) => {
    const currentCount = habits.filter(habit => habit.coin_value === coinValue && habit.is_active).length;
    const limit = HABIT_LIMITS[coinValue];

    // Jeśli limit to -1, oznacza to brak ograniczeń
    if (limit === -1) return { canAdd: true, current: currentCount, limit: 'bez limitu' };

    return {
      canAdd: currentCount < limit,
      current: currentCount,
      limit: limit
    };
  };

  const getLimitInfo = (coinValue) => {
    const info = canAddHabit(coinValue);
    if (info.limit === 'bez limitu') {
      return `${info.current} nawyków (bez limitu)`;
    }
    return `${info.current}/${info.limit} nawyków`;
  };

  const getSliderStyle = (coinValue) => {
    const info = canAddHabit(coinValue);
    let color = '#f4d03f'; // domyślny złoty kolor

    if (!info.canAdd && info.limit !== 'bez limitu') {
      color = '#ff6b6b'; // czerwony gdy limit osiągnięty
    } else if (info.current >= info.limit * 0.8 && info.limit !== 'bez limitu') {
      color = '#ffa500'; // pomarańczowy gdy blisko limitu
    }

    return {
      background: `linear-gradient(to right, ${color} 0%, ${color} ${(coinValue-1)*25}%, #e0e0e0 ${(coinValue-1)*25}%, #e0e0e0 100%)`
    };
  };

  // ============================================
  // Callback do obsługi aktualizacji monet
  // ============================================
  const handleCoinsUpdate = (newCoins) => {
    setUserCoins(newCoins);
    if (onCoinsUpdate) {
      onCoinsUpdate(newCoins);
    }
  };

  // ============================================
  // Nasłuchiwanie na event 'unauthorized'
  // ============================================
  useEffect(() => {
    const handleUnauthorized = (event) => {
      showNotification('error', event.detail.message, 'Sesja wygasła');

      // Poczekaj chwilę przed przekierowaniem
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    };

    window.addEventListener('unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  // ============================================
  // Sprawdzenie ważności tokenu przy starcie
  // ============================================
  useEffect(() => {
    const verifyTokenOnStart = async () => {
      if (!tokenUtils.hasToken()) {
        console.warn('⚠️ Brak tokenu - przekierowanie na login');
        window.location.href = '/login';
        return;
      }

      try {
        const isValid = await authAPI.verifyToken();

        if (isValid === false) {
          showNotification('error', 'Sesja wygasła', 'Wylogowano');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (isValid === true) {
          console.log('✅ Token ważny');
        }
        // null = błąd sieciowy, nie wylogowuj
      } catch (error) {
        console.error('Błąd weryfikacji tokenu:', error);
      }
    };

    verifyTokenOnStart();
  }, []);

  // ============================================
  // Nasłuchiwanie zmian stanu połączenia
  // ============================================
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError('');
      loadHabits();
      syncOfflineChanges();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================
  // Synchronizacja monet z parent komponentem
  // ============================================
  useEffect(() => {
    setUserCoins(initialCoins);
  }, [initialCoins]);

  // ============================================
  // Załadowanie nawyków przy pierwszym uruchomieniu
  // ============================================
  useEffect(() => {
    loadHabits();
  }, []);

  // ============================================
  // Synchronizacja zmian wykonanych offline
  // ============================================
  const syncOfflineChanges = async () => {
    try {
      const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');

      if (offlineCompletions.length > 0) {
        showNotification('info', 'Synchronizuję zmiany offline...', 'Synchronizacja');
      }

      for (const completion of offlineCompletions) {
        try {
          await habitAPI.completeHabit(completion.habitId);
        } catch (error) {
          console.error('Błąd synchronizacji completion:', error);
        }
      }

      localStorage.removeItem('offline_completions');
      await loadHabits();

      if (offlineCompletions.length > 0) {
        showNotification('success', 'Zmiany zsynchronizowane!', 'Synchronizacja');
      }

    } catch (error) {
      console.error('Błąd synchronizacji offline:', error);
    }
  };

  // ============================================
  // Ładowanie nawyków z serwera lub cache
  // ============================================
  const loadHabits = async () => {
    try {
      setLoading(true);
      setError('');

      // Pobranie nawyków z API
      const habits = await habitAPI.getHabits();
      setHabits(habits);

      // Zapisz do cache z timestampem (ważny 7 dni)
      cacheManager.save('habits_cache', habits, 7);

      // Sprawdzenie które nawyki zostały wykonane dzisiaj
      const today = new Date().toISOString().split('T')[0];
      const completedIds = new Set();
      habits.forEach(habit => {
        if (habit.completion_dates && habit.completion_dates.includes(today)) {
          completedIds.add(habit.id);
        }
      });
      setCompletedToday(completedIds);

    } catch (error) {
      console.error('Błąd ładowania nawyków:', error);

      // Jeśli to błąd wygasłej sesji, nie próbuj cache
      if (error.message.includes('Sesja wygasła')) {
        setError('Sesja wygasła. Za chwilę zostaniesz przekierowany...');
        return;
      }

      // Fallback do cache w przypadku błędu połączenia
      try {
        const cachedHabits = cacheManager.get('habits_cache');

        if (cachedHabits) {
          setHabits(cachedHabits);

          // Przywróć info o completed today
          const today = new Date().toISOString().split('T')[0];
          const completedKey = `completed_${today}`;
          const todayCompleted = localStorage.getItem(completedKey);
          if (todayCompleted) {
            setCompletedToday(new Set(JSON.parse(todayCompleted)));
          }

          setError('Tryb offline - używam zapisanych danych');
          showNotification('warning', 'Używam danych z cache', 'Offline');

        } else {
          setError('Nie udało się wczytać nawyków. Sprawdź połączenie internetowe.');
          showNotification('error', 'Brak zapisanych danych', 'Błąd');
        }
      } catch (cacheError) {
        console.error('Błąd cache:', cacheError);
        setError('Nie udało się wczytać nawyków.');
        showNotification('error', 'Błąd wczytywania danych', 'Błąd');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Dodawanie nowego nawyku
  // ============================================
  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) {
      showNotification('error', 'Nazwa nawyku jest wymagana', 'Błąd');
      return;
    }

    // Sprawdzenie limitów przed dodaniem nawyku
    const limitCheck = canAddHabit(newHabit.coinValue);
    if (!limitCheck.canAdd) {
      showNotification(
        'warning',
        `Możesz mieć maksymalnie ${limitCheck.limit} nawyków o wartości ${newHabit.coinValue} monet.`,
        'Osiągnięto limit'
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isOnline) {
        // Dodanie nawyku przez API gdy połączenie dostępne
        const createdHabit = await habitAPI.createHabit({
          name: newHabit.name,
          description: newHabit.description,
          coin_value: newHabit.coinValue,
          icon: newHabit.icon
        });

        setHabits(prev => {
          const updated = [...prev, createdHabit];
          cacheManager.save('habits_cache', updated, 7);
          return updated;
        });

        showNotification('success', `Nawyk "${newHabit.name}" został dodany!`, 'Sukces');

      } else {
        // Dodanie nawyku lokalnie w trybie offline
        const localHabit = {
          id: Date.now(),
          name: newHabit.name,
          description: newHabit.description,
          coin_value: parseInt(newHabit.coinValue),
          icon: newHabit.icon,
          is_active: true,
          created_at: new Date().toISOString(),
          completion_dates: [],
          isLocal: true
        };

        setHabits(prev => {
          const updated = [...prev, localHabit];
          cacheManager.save('habits_cache', updated, 7);
          return updated;
        });

        showNotification(
          'info',
          'Nawyk zostanie zsynchronizowany gdy połączenie wróci',
          'Dodano offline'
        );
      }

      // Reset formularza i powrót do listy
      setNewHabit({ name: '', description: '', coinValue: 3, icon: '🎯' });
      setCurrentView('list');

    } catch (error) {
      console.error('Błąd tworzenia nawyku:', error);

      if (error.message.includes('Sesja wygasła')) {
        showNotification('error', 'Sesja wygasła', 'Wylogowano');
      } else {
        showNotification('error', error.message, 'Błąd tworzenia nawyku');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Wykonanie nawyku i zdobycie monet
  // ============================================
  const handleCompleteHabit = async (habitId) => {
    if (completedToday.has(habitId)) return;

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const coinsToEarn = habit.coin_value;

    try {
      setLoading(true);
      setError('');

      if (isOnline && !habit.isLocal) {
        // Wykonanie nawyku przez API
        const result = await habitAPI.completeHabit(habitId);

        const newCoinsAmount = result.total_coins;
        setUserCoins(newCoinsAmount);

        if (onCoinsUpdate) {
          onCoinsUpdate(newCoinsAmount);
        }

        // Wysłanie globalnego eventu o zmianie monet
        window.dispatchEvent(new CustomEvent('coinsUpdated', {
          detail: { coins: newCoinsAmount }
        }));

        // Oznaczenie nawyku jako wykonanego dzisiaj
        setCompletedToday(prev => {
          const updated = new Set([...prev, habitId]);
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`completed_${today}`, JSON.stringify([...updated]));
          return updated;
        });

        // Aktualizacja daty wykonania w lokalnych danych
        const today = new Date().toISOString().split('T')[0];
        setHabits(prev => {
          const updated = prev.map(h =>
            h.id === habitId
              ? { ...h, completion_dates: [...(h.completion_dates || []), today] }
              : h
          );
          cacheManager.save('habits_cache', updated, 7);
          return updated;
        });

        showNotification(
          'success',
          `Otrzymałeś ${result.coins_earned} monet! 🎉`,
          result.message
        );

      } else {
        // Wykonanie nawyku w trybie offline
        const newCoinsAmount = userCoins + coinsToEarn;
        setUserCoins(newCoinsAmount);

        if (onCoinsUpdate) {
          onCoinsUpdate(newCoinsAmount);
        }

        window.dispatchEvent(new CustomEvent('coinsUpdated', {
          detail: { coins: newCoinsAmount }
        }));

        // Zapisanie do kolejki synchronizacji offline
        if (!habit.isLocal) {
          const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
          offlineCompletions.push({
            habitId: habitId,
            completedAt: new Date().toISOString(),
            coinsEarned: coinsToEarn
          });
          localStorage.setItem('offline_completions', JSON.stringify(offlineCompletions));
        }

        setCompletedToday(prev => {
          const updated = new Set([...prev, habitId]);
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem(`completed_${today}`, JSON.stringify([...updated]));
          return updated;
        });

        const today = new Date().toISOString().split('T')[0];
        setHabits(prev => {
          const updated = prev.map(h =>
            h.id === habitId
              ? { ...h, completion_dates: [...(h.completion_dates || []), today] }
              : h
          );
          cacheManager.save('habits_cache', updated, 7);
          return updated;
        });

        localStorage.setItem('offline_coins', newCoinsAmount.toString());

        const notificationType = isOnline ? 'success' : 'info';
        const notificationTitle = isOnline ? 'Brawo!' : 'Offline';
        const notificationMessage = isOnline
          ? `Otrzymałeś ${coinsToEarn} monet! 🎉`
          : `Otrzymałeś ${coinsToEarn} monet! Zostanie zsynchronizowane 🎉`;

        showNotification(notificationType, notificationMessage, notificationTitle);
      }

    } catch (error) {
      console.error('Błąd wykonywania nawyku:', error);

      // Jeśli to błąd wygasłej sesji, nie próbuj fallback
      if (error.message.includes('Sesja wygasła')) {
        showNotification('error', 'Sesja wygasła', 'Wylogowano');
        return;
      }

      // Fallback - dodanie monet lokalnie nawet przy błędzie API
      const newCoinsAmount = userCoins + coinsToEarn;
      setUserCoins(newCoinsAmount);

      if (onCoinsUpdate) {
        onCoinsUpdate(newCoinsAmount);
      }

      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: newCoinsAmount }
      }));

      const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');
      offlineCompletions.push({
        habitId: habitId,
        completedAt: new Date().toISOString(),
        coinsEarned: coinsToEarn
      });
      localStorage.setItem('offline_completions', JSON.stringify(offlineCompletions));

      setCompletedToday(prev => {
        const updated = new Set([...prev, habitId]);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`completed_${today}`, JSON.stringify([...updated]));
        return updated;
      });

      const today = new Date().toISOString().split('T')[0];
      setHabits(prev => {
        const updated = prev.map(h =>
          h.id === habitId
            ? { ...h, completion_dates: [...(h.completion_dates || []), today] }
            : h
        );
        cacheManager.save('habits_cache', updated, 7);
        return updated;
      });

      localStorage.setItem('offline_coins', newCoinsAmount.toString());

      showNotification('info', `Otrzymałeś ${coinsToEarn} monet! 🎉`, 'Offline');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Usuwanie nawyku
  // ============================================
  const handleDeleteHabit = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const confirmDelete = window.confirm(`Czy na pewno chcesz usunąć nawyk "${habit.name}"?`);
    if (!confirmDelete) return;

    try {
      setLoading(true);
      setError('');

      // Usunięcie przez API jeśli online i nawyk nie jest lokalny
      if (isOnline && !habit?.isLocal) {
        await habitAPI.deleteHabit(habitId);
      }

      // Usunięcie z lokalnej listy
      setHabits(prev => {
        const updated = prev.filter(h => h.id !== habitId);
        cacheManager.save('habits_cache', updated, 7);
        return updated;
      });

      // Usunięcie z listy wykonanych dzisiaj
      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`completed_${today}`, JSON.stringify([...newSet]));
        return newSet;
      });

      showNotification('success', `Nawyk "${habit.name}" został usunięty`, 'Usunięto');

    } catch (error) {
      console.error('Błąd usuwania nawyku:', error);

      if (error.message.includes('Sesja wygasła')) {
        showNotification('error', 'Sesja wygasła', 'Wylogowano');
        return;
      }

      // Usunięcie lokalne nawet przy błędzie API
      setHabits(prev => {
        const updated = prev.filter(h => h.id !== habitId);
        cacheManager.save('habits_cache', updated, 7);
        return updated;
      });

      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`completed_${today}`, JSON.stringify([...newSet]));
        return newSet;
      });

      showNotification('warning', 'Nawyk usunięty lokalnie', 'Offline');

    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Ponowne połączenie z serwerem
  // ============================================
  const retryConnection = async () => {
    await loadHabits();
  };

  // ============================================
  // RENDEROWANIE - Widok dodawania nawyku
  // ============================================
  if (currentView === 'add') {
    const limitInfo = canAddHabit(newHabit.coinValue);

    return (
      <div className="habit-tracker">
        <NotificationContainer
          notifications={notifications}
          onRemove={removeNotification}
        />

        <div className="habit-tracker-container">
          {/* Nagłówek z przyciskiem powrotu i wycentrowanym logo */}
          <div className="habit-header">
            <button
              className="habit-back-btn"
              onClick={() => setCurrentView('list')}
              disabled={loading}
            >
              ←
            </button>
            <div className="habit-header-center">
              <img src={HabiLogo} alt="Habi" className="habi-logo-k" />
            </div>
            <div></div>
          </div>

          {/* Formularz dodawania nawyku */}
          <div className="habit-form">
            {error && (
              <div className="error-message">
                <div>{error}</div>
                <button onClick={retryConnection} disabled={loading}>
                  Spróbuj ponownie
                </button>
              </div>
            )}

            {/* Pole nazwy nawyku */}
            <div className="form-group">
              <label className="form-label">Nazwa nawyku</label>
              <input
                type="text"
                className="form-input"
                value={newHabit.name}
                onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Pić 2L wody dziennie"
                disabled={loading}
              />
            </div>

            {/* Pole opisu nawyku */}
            <div className="form-group">
              <label className="form-label">Opis (opcjonalny)</label>
              <textarea
                className="form-textarea"
                value={newHabit.description}
                onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Krótki opis nawyku..."
                rows="3"
                disabled={loading}
              />
            </div>

            {/* Wybór ikony nawyku */}
            <div className="form-group">
              <label className="form-label">Wybierz ikonę</label>
              <div className="icon-grid">
                {availableIcons.map(icon => (
                  <button
                    key={icon}
                    className={`icon-btn ${newHabit.icon === icon ? 'selected' : ''}`}
                    onClick={() => setNewHabit(prev => ({ ...prev, icon }))}
                    disabled={loading}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Suwak wartości nagrody */}
            <div className="form-group coin-slider">
              <label className="form-label">
                Wartość nagrody: {newHabit.coinValue} monet
              </label>
              <div className="limit-info">
                <span className={!limitInfo.canAdd ? 'limit-exceeded' : ''}>
                  {getLimitInfo(newHabit.coinValue)}
                </span>
                {!limitInfo.canAdd && (
                  <span className="limit-warning">⚠️ Limit osiągnięty!</span>
                )}
              </div>
              <input
                type="range"
                className="slider-input"
                min="1"
                max="5"
                value={newHabit.coinValue}
                onChange={(e) => setNewHabit(prev => ({ ...prev, coinValue: parseInt(e.target.value) }))}
                disabled={loading}
                style={getSliderStyle(newHabit.coinValue)}
              />
              <div className="slider-labels">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            {/* Legenda limitów nawyków */}
            <div className="limits-legend">
              <h4>Limity nawyków:</h4>
              <div className="limits-grid">
                <div>🪙×5: max 1 nawyk</div>
                <div>🪙×4: max 2 nawyki</div>
                <div>🪙×3: max 3 nawyki</div>
                <div>🪙×2: max 4 nawyki</div>
                <div>🪙×1: bez limitu</div>
              </div>
            </div>

            {/* Przycisk dodawania nawyku */}
            <button
              className="submit-btn"
              onClick={handleAddHabit}
              disabled={!newHabit.name.trim() || loading || !limitInfo.canAdd}
            >
              {loading ? 'Dodawanie...' :
               !limitInfo.canAdd ? 'Osiągnięto limit' :
               'Dodaj nawyk'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDEROWANIE - Główny widok listy nawyków
  // ============================================
  return (
    <div className="habit-tracker">
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

      <div className="habit-tracker-container">
        {/* Nagłówek z wycentrowanym logo i monetami */}
        <div className="habit-header">
          <button
            className="habit-back-btn"
            onClick={onBack}
            disabled={loading}
          >
            ←
          </button>
          <div className="habit-header-center">
            <img src={HabiLogo} alt="Habi" className="habi-logo" />
          </div>
          <div className="habit-coins-display">
            <CoinSlot
              initialCoins={userCoins}
              onCoinsUpdate={handleCoinsUpdate}
              size="medium"
              showRefreshButton={true}
              autoRefresh={true}
              refreshInterval={30000}
              animated={true}
            />
          </div>
        </div>

        {/* Komunikat błędu */}
        {error && (
          <div className="error-message">
            <div>
              {!isOnline && '📶 '}
              {error}
            </div>
            <button onClick={retryConnection} disabled={loading}>
              {isOnline ? 'Odśwież' : 'Sprawdź połączenie'}
            </button>
          </div>
        )}

        {/* Wskaźnik trybu offline */}
        {!isOnline && (
          <div className="offline-indicator">
            📶 Tryb offline - zmiany będą zsynchronizowane gdy połączenie wróci
          </div>
        )}

        {/* Przycisk dodawania nowego nawyku */}
        <button
          className="add-habit-btn"
          onClick={() => setCurrentView('add')}
          disabled={loading}
        >
          <span>➕</span>
          {loading ? 'Ładowanie...' : 'Dodaj nowy nawyk'}
        </button>

        {/* Lista nawyków lub komunikat o pustej liście */}
        {!loading && habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <h3>Brak nawyków</h3>
            <p>Dodaj swój pierwszy nawyk i zacznij zbierać monety!</p>
          </div>
        ) : (
          <div>
            {habits
              .sort((a, b) => b.coin_value - a.coin_value) // Sortowanie według wartości malejąco
              .map(habit => {
                const isCompletedToday = completedToday.has(habit.id);
                return (
                  <div
                    key={habit.id}
                    className={`habit-card ${isCompletedToday ? 'completed' : ''}`}
                    onClick={() => !isCompletedToday && !loading && handleCompleteHabit(habit.id)}
                  >
                    <div className="habit-card-header">
                      <div className="habit-main-info">
                        <span className="habit-icon">{habit.icon}</span>
                        <div className="habit-info">
                          <h3 className="habit-title">
                            {habit.name}
                            {/* Oznaczenie nawyków lokalnych (offline) */}
                            {habit.isLocal && <span className="local-badge">📱</span>}
                          </h3>
                          {habit.description && (
                            <p className="habit-description">{habit.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="habit-actions">
                        {/* Wyświetlenie wartości nagrody */}
                        <div className="habit-reward">
                          <span>🪙</span>
                          <span>{habit.coin_value}</span>
                        </div>
                        {/* Przycisk usuwania nawyku */}
                        <button
                          className="habit-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHabit(habit.id);
                          }}
                          disabled={loading}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Wskaźnik wykonania nawyku dzisiaj */}
                    {isCompletedToday && (
                      <div className="completed-indicator">
                        ✅ Wykonane dzisiaj!
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitTracker;