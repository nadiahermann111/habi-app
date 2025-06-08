import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './FoodControl.css';

const FoodControl = forwardRef(({ onFeed }, ref) => {
  const [foodLevel, setFoodLevel] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  useImperativeHandle(ref, () => ({
    feedHabi: (nutritionAmount) => {
      const newLevel = Math.min(100, foodLevel + nutritionAmount);
      const currentTime = Date.now();
      setFoodLevel(newLevel);
      setLastUpdate(currentTime);
      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());

      if (onFeed) {
        onFeed(nutritionAmount);
      }

      // Dodaj wizualny efekt karmienia
      console.log(`🍽️ Habi zjadł jedzenie! +${nutritionAmount} sytości (${newLevel}%)`);
    }
  }));

  useEffect(() => {
    // Załaduj dane z localStorage przy starcie
    const savedFoodLevel = localStorage.getItem('habiFoodLevel');
    const savedLastUpdate = localStorage.getItem('habiLastUpdate');

    if (savedFoodLevel && savedLastUpdate) {
      const currentTime = Date.now();
      const timeDiff = currentTime - parseInt(savedLastUpdate);
      const hoursPassed = timeDiff / (1000 * 60 * 60); // dokładne godziny

      // Spadek głodu: 2 punkty na godzinę (można dostosować)
      let newFoodLevel = parseInt(savedFoodLevel) - (hoursPassed * 2);
      newFoodLevel = Math.max(0, newFoodLevel); // Nie może być poniżej 0

      setFoodLevel(Math.round(newFoodLevel));
      setLastUpdate(currentTime);

      // Zapisz nowy stan jeśli znacząco się zmienił
      if (Math.abs(newFoodLevel - parseInt(savedFoodLevel)) > 1) {
        localStorage.setItem('habiFoodLevel', Math.round(newFoodLevel).toString());
        localStorage.setItem('habiLastUpdate', currentTime.toString());
      }
    } else {
      // Pierwszy raz - ustaw domyślny poziom
      const currentTime = Date.now();
      setFoodLevel(75); // Zacznij z 75% zamiast 100%
      setLastUpdate(currentTime);
      localStorage.setItem('habiFoodLevel', '75');
      localStorage.setItem('habiLastUpdate', currentTime.toString());
    }
  }, []);

  useEffect(() => {
    // Ustaw interval do sprawdzania co 30 sekund (częściej dla płynności)
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const savedLastUpdate = localStorage.getItem('habiLastUpdate');

      if (savedLastUpdate) {
        const timeDiff = currentTime - parseInt(savedLastUpdate);
        const hoursPassed = timeDiff / (1000 * 60 * 60);

        // Aktualizuj co ~6 minut (0.1 godziny)
        if (hoursPassed >= 0.1) {
          setFoodLevel(prevLevel => {
            const decrease = hoursPassed * 2; // 2 punkty na godzinę
            const newLevel = Math.max(0, prevLevel - decrease);
            localStorage.setItem('habiFoodLevel', Math.round(newLevel).toString());
            localStorage.setItem('habiLastUpdate', currentTime.toString());
            return Math.round(newLevel);
          });
          setLastUpdate(currentTime);
        }
      }
    }, 30000); // Sprawdzaj co 30 sekund

    return () => clearInterval(interval);
  }, []);

  const getFoodBarColor = () => {
    if (foodLevel > 60) return '#4CAF50'; // Zielony
    if (foodLevel > 30) return '#FFC107'; // Żółty
    if (foodLevel > 10) return '#FF9800'; // Pomarańczowy
    return '#F44336'; // Czerwony
  };

  const getFoodStatus = () => {
    if (foodLevel > 80) return 'Habi jest bardzo szczęśliwy! 😄';
    if (foodLevel > 60) return 'Habi czuje się świetnie! 😊';
    if (foodLevel > 40) return 'Habi jest w porządku 😌';
    if (foodLevel > 20) return 'Habi potrzebuje jedzenia 😐';
    if (foodLevel > 5) return 'Habi jest głodny! 😟';
    return 'Habi jest bardzo głodny! 😢';
  };

  const getHabiMood = () => {
    if (foodLevel > 80) return '😄';
    if (foodLevel > 60) return '😊';
    if (foodLevel > 40) return '😌';
    if (foodLevel > 20) return '😐';
    if (foodLevel > 5) return '😟';
    return '😢';
  };

  const getTimeUntilNextHunger = () => {
    const currentTime = Date.now();
    const savedLastUpdate = localStorage.getItem('habiLastUpdate');

    if (savedLastUpdate) {
      const timeDiff = currentTime - parseInt(savedLastUpdate);
      const timeUntilNext = (1000 * 60 * 60 * 0.5) - (timeDiff % (1000 * 60 * 60 * 0.5)); // co 30 minut
      const minutes = Math.floor(timeUntilNext / (1000 * 60));
      return Math.max(0, minutes);
    }
    return 30;
  };

  const getLastFeedTime = () => {
    const savedLastUpdate = localStorage.getItem('habiLastUpdate');
    if (savedLastUpdate) {
      const lastUpdate = new Date(parseInt(savedLastUpdate));
      return lastUpdate.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Nieznany';
  };

  return (
    <div className="food-control-compact">
      {/* Info Popup */}
      {showInfoPopup && (
        <div className="info-popup-overlay" onClick={() => setShowInfoPopup(false)}>
          <div className="info-popup" onClick={e => e.stopPropagation()}>
            <div className="info-popup-header">
              <h3>Informacje o Habi</h3>
              <button
                className="close-popup-btn"
                onClick={() => setShowInfoPopup(false)}
              >
                ✕
              </button>
            </div>

            <div className="info-popup-content">
              <div className="habi-avatar">
                <div className="habi-face-popup">
                  <span className="habi-mood-popup">{getHabiMood()}</span>
                </div>
                <div className="habi-name-popup">Habi</div>
              </div>

              <div className="info-section">
                <h4>📊 Statystyki</h4>
                <div className="info-stats">
                  <div className="info-stat">
                    <span className="stat-label">Poziom sytości:</span>
                    <span className="stat-value">{Math.round(foodLevel)}%</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-label">Ostatnia aktualizacja:</span>
                    <span className="stat-value">{getLastFeedTime()}</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-label">Następny spadek za:</span>
                    <span className="stat-value">{getTimeUntilNextHunger()} min</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>🎯 Mechanika</h4>
                <div className="info-rules">
                  <div className="rule-item">
                    <span className="rule-icon">⏰</span>
                    <span>Spadek sytości: -2% co godzinę</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">🎯</span>
                    <span>Cel: Utrzymaj poziom >40%</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">🍎</span>
                    <span>Kupuj jedzenie za monety z nawyków</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">💪</span>
                    <span>Więcej odżywiania = dłuższa sytość</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>💡 Wskazówki</h4>
                <div className="tips-list">
                  <p>• Wykonuj nawyki regularnie aby zdobywać monety</p>
                  <p>• Droższe jedzenie daje więcej sytości</p>
                  <p>• Stan zapisuje się automatycznie w przeglądarce</p>
                  <p>• Szczęśliwy Habi = większa motywacja!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Food Control Bar */}
      <div className="food-control-header">
        <div className="food-control-left">
          <button
            className="info-btn"
            onClick={() => setShowInfoPopup(true)}
            title="Informacje o Habi"
          >
            ℹ️
          </button>
          <span className="habi-mood-small">{getHabiMood()}</span>
          <span className="food-control-title">Stan Habi: {Math.round(foodLevel)}%</span>
        </div>
      </div>

      <div className="food-bar-compact">
        <div className="food-bar-background-compact">
          <div
            className="food-bar-fill-compact"
            style={{
              width: `${foodLevel}%`,
              backgroundColor: getFoodBarColor(),
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>

      <div className="food-status-compact">
        {getFoodStatus()}
      </div>
    </div>
  );
});

FoodControl.displayName = 'FoodControl';

export default FoodControl;