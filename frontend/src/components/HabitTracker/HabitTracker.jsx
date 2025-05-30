import { useState, useEffect } from 'react';
import { habitsAPI } from '../../services/api.jsx';
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

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const habitsData = await habitsAPI.getHabits();
      setHabits(habitsData);
    } catch (err) {
      setError('Błąd pobierania nawyków');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    if (!newHabit.name.trim()) {
      setError('Nazwa nawyku jest wymagana');
      return;
    }

    try {
      const createdHabit = await habitsAPI.createHabit(newHabit);
      setHabits(prev => [createdHabit, ...prev]);
      setNewHabit({ name: '', description: '', reward_coins: 1 });
      setShowAddForm(false);
      setSuccessMessage('Nawyk został dodany!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Błąd dodawania nawyku');
      console.error(err);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      const result = await habitsAPI.completeHabit(habitId);

      // Aktualizuj stan nawyku
      setHabits(prev => prev.map(habit =>
        habit.id === habitId
          ? { ...habit, completed_today: true }
          : habit
      ));

      // Wyślij event o aktualizacji monet
      window.dispatchEvent(new CustomEvent('coinsUpdated'));

      setSuccessMessage(`${result.message} 🎉`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      if (err.response?.status === 400) {
        setError('Ten nawyk został już wykonany dzisiaj!');
      } else {
        setError('Błąd oznaczania nawyku jako wykonany');
      }
      setTimeout(() => setError(''), 3000);
      console.error(err);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!confirm('Czy jesteś pewien, że chcesz usunąć ten nawyk?')) {
      return;
    }

    try {
      await habitsAPI.deleteHabit(habitId);
      setHabits(prev => prev.filter(habit => habit.id !== habitId));
      setSuccessMessage('Nawyk został usunięty');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Błąd usuwania nawyku');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="loading">Ładowanie nawyków...</div>;
  }

  return (
    <div className="habit-tracker">
      <div className="habit-tracker-header">
        <button className="back-btn" onClick={onBack}>
          ← Powrót do Dashboard
        </button>
        <h1>Śledzenie Nawyków</h1>
        <button
          className="add-habit-btn"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '❌ Anuluj' : '➕ Dodaj nawyk'}
        </button>
      </div>

      {error && (
        <div className="message error-message">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="message success-message">
          {successMessage}
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
              />
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
              />
            </div>

            <div className="form-group">
              <label htmlFor="reward_coins">Nagroda (monety)</label>
              <input
                type="number"
                id="reward_coins"
                value={newHabit.reward_coins}
                onChange={(e) => setNewHabit(prev => ({ ...prev, reward_coins: parseInt(e.target.value) || 1 }))}
                min="1"
                max="10"
              />
            </div>

            <div className="form-buttons">
              <button type="submit" className="submit-btn">
                Dodaj nawyk
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowAddForm(false)}
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
            <p>Dodaj swój pierwszy nawyk, aby zacząć!</p>
          </div>
        ) : (
          <div className="habits-grid">
            {habits.map(habit => (
              <div key={habit.id} className={`habit-card ${habit.completed_today ? 'completed' : ''}`}>
                <div className="habit-header">
                  <h3 className="habit-name">{habit.name}</h3>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteHabit(habit.id)}
                    title="Usuń nawyk"
                  >
                    🗑️
                  </button>
                </div>

                {habit.description && (
                  <p className="habit-description">{habit.description}</p>
                )}

                <div className="habit-reward">
                  <span className="coins-icon">🪙</span>
                  <span>{habit.reward_coins} monet</span>
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
                    >
                      Oznacz jako wykonane
                    </button>
                  )}
                </div>

                <div className="habit-date">
                  Utworzono: {new Date(habit.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitTracker;