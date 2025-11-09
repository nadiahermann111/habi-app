import React, { useState, useEffect } from 'react';
import HabiLogo from '../DressHabi/habi-logo.png';
import './HabitStats.css';

const HabitStats = ({ onBack }) => {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const API_BASE_URL = 'https://habi-backend.onrender.com';

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  // Pobieranie statystyk
  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Musisz być zalogowany');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/habits/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Błąd pobierania statystyk');

      const data = await response.json();
      console.log('✅ Pobrano statystyki:', data);
      setStatistics(data.statistics || []);
    } catch (error) {
      console.error('❌ Błąd fetchStatistics:', error);
      setError('Nie udało się pobrać statystyk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // Funkcja generująca kalendarz dla danego miesiąca
  const generateCalendar = (habit) => {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar = [];
    let week = [];

    // Puste komórki przed pierwszym dniem miesiąca
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      week.push(null);
    }

    // Dni miesiąca
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCompleted = habit.completion_dates.includes(dateStr);

      week.push({ day, dateStr, isCompleted });

      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
    }

    // Dopełnij ostatni tydzień
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      calendar.push(week);
    }

    return calendar;
  };

  const changeMonth = (delta) => {
    let newMonth = currentMonth + delta;
    let newYear = currentYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  if (loading) {
    return (
      <div className="habit-tracker">
        <div className="habit-tracker-container">
          <div className="loading-screen">
            <div style={{ fontSize: '48px' }}>📊</div>
            <div>Ładowanie statystyk...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="habit-tracker">
      <div className="habit-tracker-container">
        {/* Header */}
        <div className="tracker-header">
          <div className="tracker-header-left">
            <button className="tracker-back-btn" onClick={onBack}>
              ←
            </button>
            <img src={HabiLogo} alt="Habi" className="habi-logo-tracker" />
          </div>
          <h2 className="tracker-title">Habit Tracker</h2>
        </div>

        {error && (
          <div className="error-box">
            ❌ {error}
          </div>
        )}

        {/* Statystyki ogólne */}
        <div className="overall-stats">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.length}</div>
              <div className="stat-label">Aktywnych nawyków</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">
                {statistics.reduce((sum, h) => sum + h.total_completions, 0)}
              </div>
              <div className="stat-label">Łączne wykonania</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">
                {Math.max(...statistics.map(h => h.current_streak), 0)}
              </div>
              <div className="stat-label">Najdłuższy streak</div>
            </div>
          </div>
        </div>

        {/* Lista nawyków */}
        {statistics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Brak nawyków</h3>
            <p>Dodaj swój pierwszy nawyk, aby zobaczyć statystyki!</p>
          </div>
        ) : (
          <div className="habits-list">
            {statistics.map((habit) => (
              <div
                key={habit.habit_id}
                className={`habit-stat-card ${selectedHabit?.habit_id === habit.habit_id ? 'selected' : ''}`}
                onClick={() => setSelectedHabit(habit)}
              >
                <div className="habit-stat-header">
                  <div className="habit-stat-icon">{habit.habit_icon}</div>
                  <div className="habit-stat-info">
                    <h3>{habit.habit_name}</h3>
                    <div className="habit-stat-badges">
                      <span className="badge">🪙 {habit.reward_coins} monet</span>
                      <span className="badge">✅ {habit.total_completions}x</span>
                    </div>
                  </div>
                </div>

                <div className="habit-stat-details">
                  <div className="stat-row">
                    <span className="stat-label-small">Obecny streak:</span>
                    <span className="stat-value-small">🔥 {habit.current_streak} dni</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-small">Najdłuższy streak:</span>
                    <span className="stat-value-small">⭐ {habit.longest_streak} dni</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label-small">Ostatnio:</span>
                    <span className="stat-value-small">
                      📅 {habit.last_completion_date || 'Nigdy'}
                    </span>
                  </div>
                </div>

                {/* Mini kalendarz (ostatnie 31 dni) */}
                <div className="mini-calendar">
                  {(() => {
                    const today = new Date();
                    const days = [];
                    for (let i = 30; i >= 0; i--) {
                      const date = new Date(today);
                      date.setDate(date.getDate() - i);
                      const dateStr = date.toISOString().split('T')[0];
                      const isCompleted = habit.completion_dates.includes(dateStr);
                      days.push(
                        <div
                          key={dateStr}
                          className={`mini-day ${isCompleted ? 'completed' : 'empty'}`}
                          title={dateStr}
                        />
                      );
                    }
                    return days;
                  })()}
                </div>

                <button
                  className="view-calendar-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHabit(habit);
                  }}
                >
                  Zobacz pełny kalendarz →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pełny kalendarz dla wybranego nawyku */}
        {selectedHabit && (
          <div className="calendar-modal" onClick={() => setSelectedHabit(null)}>
            <div className="calendar-content" onClick={(e) => e.stopPropagation()}>
              <button className="close-modal" onClick={() => setSelectedHabit(null)}>
                ✕
              </button>

              <div className="calendar-header">
                <div className="habit-title">
                  <span className="habit-icon-large">{selectedHabit.habit_icon}</span>
                  <h3>{selectedHabit.habit_name}</h3>
                </div>

                <div className="month-navigation">
                  <button onClick={() => changeMonth(-1)}>←</button>
                  <span className="month-year">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <button onClick={() => changeMonth(1)}>→</button>
                </div>
              </div>

              <div className="calendar-grid">
                <div className="calendar-header-row">
                  <div className="day-header">Pon</div>
                  <div className="day-header">Wt</div>
                  <div className="day-header">Śr</div>
                  <div className="day-header">Czw</div>
                  <div className="day-header">Pt</div>
                  <div className="day-header">Sob</div>
                  <div className="day-header">Nie</div>
                </div>

                {generateCalendar(selectedHabit).map((week, weekIndex) => (
                  <div key={weekIndex} className="calendar-week">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`calendar-day ${
                          day ? (day.isCompleted ? 'completed' : 'empty') : 'disabled'
                        }`}
                      >
                        {day && (
                          <>
                            <span className="day-number">{day.day}</span>
                            {day.isCompleted && <span className="check-mark">✓</span>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="calendar-legend">
                <div className="legend-item">
                  <div className="legend-box completed"></div>
                  <span>Wykonane</span>
                </div>
                <div className="legend-item">
                  <div className="legend-box empty"></div>
                  <span>Niewykonane</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitStats;