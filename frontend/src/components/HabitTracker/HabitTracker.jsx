// HabitTracker.jsx - zaktualizowany z CoinSlot i Habi Logo
import React, { useState, useEffect } from 'react';
import { habitAPI } from '../../services/api.jsx';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png'; // Dodaj import logo
import './HabitTracker.css';

const HabitTracker = ({ onBack, initialCoins = 0, onCoinsUpdate }) => {
  const [currentView, setCurrentView] = useState('list');
  const [habits, setHabits] = useState([]);
  const [userCoins, setUserCoins] = useState(initialCoins);
  const [completedToday, setCompletedToday] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    coinValue: 3,
    icon: '🎯'
  });

  const availableIcons = ['🎯', '💪', '📚', '🏃', '💧', '🧘', '🎵', '🎨', '🍎', '😴'];

  // Funkcja do obsługi aktualizacji monet z CoinSlot
  const handleCoinsUpdate = (newCoins) => {
    setUserCoins(newCoins);
    if (onCoinsUpdate) {
      onCoinsUpdate(newCoins);
    }
  };

  // Sprawdź stan połączenia
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

  // Synchronizuj monety z Dashboard
  useEffect(() => {
    setUserCoins(initialCoins);
  }, [initialCoins]);

  // Wczytaj nawyki przy starcie
  useEffect(() => {
    loadHabits();
  }, []);

  // Funkcja do synchronizacji zmian offline
  const syncOfflineChanges = async () => {
    try {
      const offlineCompletions = JSON.parse(localStorage.getItem('offline_completions') || '[]');

      for (const completion of offlineCompletions) {
        try {
          await habitAPI.completeHabit(completion.habitId);
        } catch (error) {
          console.error('Błąd synchronizacji completion:', error);
        }
      }

      localStorage.removeItem('offline_completions');
      await loadHabits();

    } catch (error) {
      console.error('Błąd synchronizacji offline:', error);
    }
  };

  const loadHabits = async () => {
    try {
      setLoading(true);
      setError('');

      const habits = await habitAPI.getHabits();
      setHabits(habits);
      localStorage.setItem('habits_cache', JSON.stringify(habits));

      const today = new Date().toISOString().split('T')[0];
      const completedIds = new Set();
      habits.forEach(habit => {
        if (habit.completion_dates && habit.completion_dates.includes(today)) {
          completedIds.add(habit.id);
        }
      });
      setCompletedToday(completedIds);

      // Pobierz aktualne monety - CoinSlot się tym zajmie automatycznie

    } catch (error) {
      console.error('Błąd ładowania nawyków:', error);

      try {
        const cachedHabits = localStorage.getItem('habits_cache');
        if (cachedHabits) {
          const habits = JSON.parse(cachedHabits);
          setHabits(habits);

          const today = new Date().toISOString().split('T')[0];
          const completedKey = `completed_${today}`;
          const todayCompleted = localStorage.getItem(completedKey);
          if (todayCompleted) {
            setCompletedToday(new Set(JSON.parse(todayCompleted)));
          }

          setError('Tryb offline - używam zapisanych danych');
        } else {
          setError('Nie udało się wczytać nawyków. Sprawdź połączenie internetowe.');
        }
      } catch (cacheError) {
        console.error('Błąd cache:', cacheError);
        setError('Nie udało się wczytać nawyków.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) {
      alert('Nazwa nawyku jest wymagana');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isOnline) {
        const createdHabit = await habitAPI.createHabit({
          name: newHabit.name,
          description: newHabit.description,
          coin_value: newHabit.coinValue,
          icon: newHabit.icon
        });

        setHabits(prev => {
          const updated = [...prev, createdHabit];
          localStorage.setItem('habits_cache', JSON.stringify(updated));
          return updated;
        });

      } else {
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
          localStorage.setItem('habits_cache', JSON.stringify(updated));
          return updated;
        });

        setError('Nawyk dodany offline - zostanie zsynchronizowany gdy połączenie wróci');
      }

      setNewHabit({ name: '', description: '', coinValue: 3, icon: '🎯' });
      setCurrentView('list');

    } catch (error) {
      console.error('Błąd tworzenia nawyku:', error);
      setError('Błąd tworzenia nawyku: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    if (completedToday.has(habitId)) return;

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const coinsToEarn = habit.coin_value;

    try {
      setLoading(true);
      setError('');

      if (isOnline && !habit.isLocal) {
        const result = await habitAPI.completeHabit(habitId);

        const newCoinsAmount = result.total_coins;
        setUserCoins(newCoinsAmount);

        if (onCoinsUpdate) {
          onCoinsUpdate(newCoinsAmount);
        }

        // Wyślij globalny event o zmianie monet
        window.dispatchEvent(new CustomEvent('coinsUpdated', {
          detail: { coins: newCoinsAmount }
        }));

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
          localStorage.setItem('habits_cache', JSON.stringify(updated));
          return updated;
        });

        alert(`${result.message}! Otrzymałeś ${result.coins_earned} monet! 🎉`);

      } else {
        const newCoinsAmount = userCoins + coinsToEarn;
        setUserCoins(newCoinsAmount);

        if (onCoinsUpdate) {
          onCoinsUpdate(newCoinsAmount);
        }

        // Wyślij globalny event o zmianie monet
        window.dispatchEvent(new CustomEvent('coinsUpdated', {
          detail: { coins: newCoinsAmount }
        }));

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
          localStorage.setItem('habits_cache', JSON.stringify(updated));
          return updated;
        });

        localStorage.setItem('offline_coins', newCoinsAmount.toString());

        const message = isOnline ?
          `Brawo! Otrzymałeś ${coinsToEarn} monet! 🎉` :
          `Offline: Otrzymałeś ${coinsToEarn} monet! Zostanie zsynchronizowane 🎉`;
        alert(message);
      }

    } catch (error) {
      console.error('Błąd wykonywania nawyku:', error);
      setError('Błąd: ' + error.message);

      const newCoinsAmount = userCoins + coinsToEarn;
      setUserCoins(newCoinsAmount);

      if (onCoinsUpdate) {
        onCoinsUpdate(newCoinsAmount);
      }

      // Wyślij globalny event o zmianie monet
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
        localStorage.setItem('habits_cache', JSON.stringify(updated));
        return updated;
      });

      localStorage.setItem('offline_coins', newCoinsAmount.toString());
      alert(`Offline: Otrzymałeś ${coinsToEarn} monet! 🎉`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!confirm('Czy na pewno chcesz usunąć ten nawyk?')) return;

    try {
      setLoading(true);
      setError('');

      const habit = habits.find(h => h.id === habitId);

      if (isOnline && !habit?.isLocal) {
        await habitAPI.deleteHabit(habitId);
      }

      setHabits(prev => {
        const updated = prev.filter(h => h.id !== habitId);
        localStorage.setItem('habits_cache', JSON.stringify(updated));
        return updated;
      });

      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`completed_${today}`, JSON.stringify([...newSet]));
        return newSet;
      });

    } catch (error) {
      console.error('Błąd usuwania nawyku:', error);
      setError('Błąd usuwania nawyku: ' + error.message);

      setHabits(prev => {
        const updated = prev.filter(h => h.id !== habitId);
        localStorage.setItem('habits_cache', JSON.stringify(updated));
        return updated;
      });

      setCompletedToday(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(`completed_${today}`, JSON.stringify([...newSet]));
        return newSet;
      });

    } finally {
      setLoading(false);
    }
  };

  const retryConnection = async () => {
    await loadHabits();
  };

  if (currentView === 'add') {
    return (
      <div className="habit-tracker">
        <div className="habit-tracker-container">
          {/* Header z logo */}
          <div className="habit-header">
            <div className="habit-header-left">
              <button
                className="habit-back-btn"
                onClick={() => setCurrentView('list')}
                disabled={loading}
              >
                ←
              </button>
              <img src={HabiLogo} alt="Habi" className="habi-logo-k" />
            </div>
          </div>

          {/* Formularz - reszta bez zmian... */}
          <div className="habit-form">
            {error && (
              <div className="error-message">
                {error}
                <button onClick={retryConnection} disabled={loading}>
                  Spróbuj ponownie
                </button>
              </div>
            )}

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

            <div className="form-group coin-slider">
              <label className="form-label">
                Wartość nagrody: {newHabit.coinValue} monet
              </label>
              <input
                type="range"
                className="slider-input"
                min="1"
                max="5"
                value={newHabit.coinValue}
                onChange={(e) => setNewHabit(prev => ({ ...prev, coinValue: parseInt(e.target.value) }))}
                disabled={loading}
                style={{
                  background: `linear-gradient(to right, #f4d03f 0%, #f4d03f ${(newHabit.coinValue-1)*25}%, #e0e0e0 ${(newHabit.coinValue-1)*25}%, #e0e0e0 100%)`
                }}
              />
              <div className="slider-labels">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <button
              className="submit-btn"
              onClick={handleAddHabit}
              disabled={!newHabit.name.trim() || loading}
            >
              {loading ? 'Dodawanie...' : 'Dodaj nawyk'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Widok listy nawyków
  return (
    <div className="habit-tracker">
      <div className="habit-tracker-container">
        {/* Header z CoinSlot i logo */}
        <div className="habit-header">
          <div className="habit-header-left">
            <button
              className="habit-back-btn"
              onClick={onBack}
              disabled={loading}
            >
              ←
            </button>
            <img src={HabiLogo} alt="Habi" className="habi-logo" />
          </div>

          {/* CoinSlot zamiast prostego wyświetlania monet */}
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

        {/* Error message */}
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

        {/* Connection status */}
        {!isOnline && (
          <div className="offline-indicator">
            📶 Tryb offline - zmiany będą zsynchronizowane gdy połączenie wróci
          </div>
        )}

        {/* Przycisk dodania nawyku */}
        <button
          className="add-habit-btn"
          onClick={() => setCurrentView('add')}
          disabled={loading}
        >
          <span>➕</span>
          {loading ? 'Ładowanie...' : 'Dodaj nowy nawyk'}
        </button>

        {/* Lista nawyków */}
        {!loading && habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <h3>Brak nawyków</h3>
            <p>Dodaj swój pierwszy nawyk i zacznij zbierać monety!</p>
          </div>
        ) : (
          <div>
            {habits.map(habit => {
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
                          {habit.isLocal && <span className="local-badge">📱</span>}
                        </h3>
                        {habit.description && (
                          <p className="habit-description">{habit.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="habit-actions">
                      <div className="habit-reward">
                        <span>🪙</span>
                        <span>{habit.coin_value}</span>
                      </div>
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