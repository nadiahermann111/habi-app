import { useState, useEffect, useCallback } from 'react';
import { habitsAPI, tokenUtils } from '../../services/api.jsx';
import './HabitTracker.css';

const HabitTracker = ({ onBack }) => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    reward_coins: 1
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FIXED: Użyj useCallback aby uniknąć nieskończonych re-renderów
  const fetchHabits = useCallback(async () => {
    // Sprawdź czy użytkownik jest zalogowany
    if (!tokenUtils.isLoggedIn()) {
      setError('Nie jesteś zalogowany');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const habitsData = await habitsAPI.getHabits();
      setHabits(habitsData);
    } catch (err) {
      console.error('Error fetching habits:', err);

      // Sprawdź czy to błąd autoryzacji
      if (err.message.includes('401') || err.message.includes('token')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        tokenUtils.removeToken();
        // Opcjonalnie: przekieruj do strony logowania
        // window.location.href = '/login';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Sprawdź czy backend działa.');
      } else {
        setError(`Błąd pobierania nawyków: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, []); // Pusta tablica dependencies

  // FIXED: Użyj useCallback dla lepszej wydajności
  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
  }, []);

  // FIXED: Załaduj nawyki tylko raz przy montowaniu komponentu
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // FIXED: Dodaj cleanup dla timeoutów
  useEffect(() => {
    let timeoutId;
    if (successMessage || error) {
      timeoutId = setTimeout(() => {
        clearMessages();
      }, 5000); // Zwiększ czas na 5 sekund
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [successMessage, error, clearMessages]);

  const handleAddHabit = async (e) => {
    e.preventDefault();

    if (!newHabit.name.trim()) {
      setError('Nazwa nawyku jest wymagana');
      return;
    }

    if (newHabit.name.trim().length < 2) {
      setError('Nazwa nawyku musi mieć co najmniej 2 znaki');
      return;
    }

    if (newHabit.reward_coins < 1 || newHabit.reward_coins > 50) {
      setError('Nagroda musi być między 1 a 50 monet');
      return;
    }

    setIsSubmitting(true);
    clearMessages();

    try {
      const habitData = {
        name: newHabit.name.trim(),
        description: newHabit.description.trim() || null,
        reward_coins: parseInt(newHabit.reward_coins) || 1
      };

      const createdHabit = await habitsAPI.createHabit(habitData);

      // Dodaj nowy nawyk na początek listy
      setHabits(prev => [createdHabit, ...prev]);

      // Resetuj formularz
      setNewHabit({ name: '', description: '', reward_coins: 1 });
      setShowAddForm(false);
      setSuccessMessage('Nawyk został pomyślnie dodany! 🎉');

    } catch (err) {
      console.error('Error creating habit:', err);

      if (err.message.includes('401') || err.message.includes('token')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        tokenUtils.removeToken();
      } else if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Spróbuj ponownie.');
      } else {
        setError(`Błąd dodawania nawyku: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    // Sprawdź czy nawyk nie jest już wykonany
    const habit = habits.find(h => h.id === habitId);
    if (habit?.completed_today) {
      setError('Ten nawyk został już wykonany dzisiaj!');
      return;
    }

    clearMessages();

    try {
      const result = await habitsAPI.completeHabit(habitId);

      // Aktualizuj stan nawyku
      setHabits(prev => prev.map(habit =>
        habit.id === habitId
          ? { ...habit, completed_today: true }
          : habit
      ));

      // FIXED: Lepsze zarządzanie eventem aktualizacji monet
      const coinsEvent = new CustomEvent('coinsUpdated', {
        detail: {
          coinsEarned: result.coins_earned,
          totalCoins: result.total_coins
        }
      });
      window.dispatchEvent(coinsEvent);

      setSuccessMessage(`${result.message} 🎉`);

    } catch (err) {
      console.error('Error completing habit:', err);

      if (err.response?.status === 400 || err.message.includes('już został wykonany')) {
        setError('Ten nawyk został już wykonany dzisiaj!');
        // Aktualizuj lokalny stan na wszelki wypadek
        setHabits(prev => prev.map(habit =>
          habit.id === habitId
            ? { ...habit, completed_today: true }
            : habit
        ));
      } else if (err.message.includes('401') || err.message.includes('token')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        tokenUtils.removeToken();
      } else if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Spróbuj ponownie.');
      } else {
        setError(`Błąd oznaczania nawyku: ${err.message}`);
      }
    }
  };

  const handleDeleteHabit = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    const habitName = habit?.name || 'ten nawyk';

    if (!confirm(`Czy jesteś pewien, że chcesz usunąć nawyk "${habitName}"?`)) {
      return;
    }

    clearMessages();

    try {
      await habitsAPI.deleteHabit(habitId);
      setHabits(prev => prev.filter(habit => habit.id !== habitId));
      setSuccessMessage('Nawyk został usunięty');

    } catch (err) {
      console.error('Error deleting habit:', err);

      if (err.message.includes('401') || err.message.includes('token')) {
        setError('Sesja wygasła. Zaloguj się ponownie.');
        tokenUtils.removeToken();
      } else if (err.message.includes('404')) {
        // Nawyk już nie istnieje - usuń z lokalnego stanu
        setHabits(prev => prev.filter(habit => habit.id !== habitId));
        setSuccessMessage('Nawyk został usunięty');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Problemy z połączeniem do serwera. Spróbuj ponownie.');
      } else {
        setError(`Błąd usuwania nawyku: ${err.message}`);
      }
    }
  };

  // FIXED: Dodaj funkcję odświeżania
  const handleRefresh = () => {
    fetchHabits();
  };

  if (loading) {
    return (
      <div className="habit-tracker">
        <div className="loading">
          <div className="loading-spinner">⏳</div>
          <p>Ładowanie nawyków...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-tracker">
      <div className="habit-tracker-header">
        <button className="back-btn" onClick={onBack} disabled={isSubmitting}>
          ← Powrót do Dashboard
        </button>
        <h1>Śledzenie Nawyków</h1>
        <div className="header-actions">
          <button
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={loading || isSubmitting}
            title="Odśwież listę nawyków"
          >
            🔄
          </button>
          <button
            className="add-habit-btn"
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={isSubmitting}
          >
            {showAddForm ? '❌ Anuluj' : '➕ Dodaj nawyk'}
          </button>
        </div>
      </div>

      {error && (
        <div className="message error-message">
          <span className="message-icon">⚠️</span>
          <span className="message-text">{error}</span>
          <button
            className="message-close"
            onClick={clearMessages}
            title="Zamknij wiadomość"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="message success-message">
          <span className="message-icon">✅</span>
          <span className="message-text">{successMessage}</span>
          <button
            className="message-close"
            onClick={clearMessages}
            title="Zamknij wiadomość"
          >
            ✕
          </button>
        </div>
      )}

      {showAddForm && (
        <div className="add-habit-form">
          <h3>Dodaj nowy nawyk</h3>
          <form onSubmit={handleAddHabit}>
            <div className="form-group">
              <label htmlFor="name">Nazwa nawyku *</label>
              <input
                type="text"
                id="name"
                value={newHabit.name}
                onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                placeholder="np. Picie wody, Ćwiczenia, Czytanie"
                maxLength={100}
                required
                disabled={isSubmitting}
                // FIXED: Dodaj autocomplete
                autoComplete="off"
              />
              <small className="field-hint">
                Minimum 2 znaki, maksimum 100 znaków
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Opis (opcjonalny)</label>
              <textarea
                id="description"
                value={newHabit.description}
                onChange={(e) => setNewHabit(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Krótki opis nawyku..."
                maxLength={255}
                rows={3}
                disabled={isSubmitting}
                autoComplete="off"
              />
              <small className="field-hint">
                Maksimum 255 znaków
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="reward_coins">Nagroda (monety)</label>
              <input
                type="number"
                id="reward_coins"
                value={newHabit.reward_coins}
                onChange={(e) => setNewHabit(prev => ({
                  ...prev,
                  reward_coins: Math.max(1, Math.min(50, parseInt(e.target.value) || 1))
                }))}
                min="1"
                max="50"
                disabled={isSubmitting}
                autoComplete="off"
              />
              <small className="field-hint">
                Od 1 do 50 monet za wykonanie
              </small>
            </div>

            <div className="form-buttons">
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting || !newHabit.name.trim()}
              >
                {isSubmitting ? '⏳ Dodaję...' : 'Dodaj nawyk'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setNewHabit({ name: '', description: '', reward_coins: 1 });
                  clearMessages();
                }}
                disabled={isSubmitting}
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="habits-container">
        {habits.length === 0 ? (
          <div className="no-habits">
            <div className="no-habits-icon">📝</div>
            <h3>Brak nawyków</h3>
            <p>Dodaj swój pierwszy nawyk, aby zacząć zbierać monety!</p>
            {!showAddForm && (
              <button
                className="add-first-habit-btn"
                onClick={() => setShowAddForm(true)}
              >
                ➕ Dodaj pierwszy nawyk
              </button>
            )}
          </div>
        ) : (
          <div className="habits-grid">
            {habits.map(habit => (
              <div key={habit.id} className={`habit-card ${habit.completed_today ? 'completed' : ''}`}>
                <div className="habit-header">
                  <h3 className="habit-name" title={habit.name}>
                    {habit.name}
                  </h3>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteHabit(habit.id)}
                    title="Usuń nawyk"
                    disabled={isSubmitting}
                  >
                    🗑️
                  </button>
                </div>

                {habit.description && (
                  <p className="habit-description" title={habit.description}>
                    {habit.description}
                  </p>
                )}

                <div className="habit-reward">
                  <span className="coins-icon">🪙</span>
                  <span>{habit.reward_coins} {habit.reward_coins === 1 ? 'moneta' : 'monet'}</span>
                </div>

                <div className="habit-actions">
                  {habit.completed_today ? (
                    <div className="completed-badge">
                      ✅ Wykonane dzisiaj!
                    </div>
                  ) : (
                    <button
                      className="complete-btn"
                      onClick={() => handleCompleteHabit(habit.id)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '⏳' : '✓'} Oznacz jako wykonane
                    </button>
                  )}
                </div>

                <div className="habit-date">
                  Utworzono: {new Date(habit.created_at).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FIXED: Dodaj status połączenia */}
      <div className="connection-status">
        <small>
          {navigator.onLine ? '🟢 Online' : '🔴 Offline'}
        </small>
      </div>
    </div>
  );
};

export default HabitTracker;