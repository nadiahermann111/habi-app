import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './FoodControl.css';

const FoodControl = forwardRef(({ onFeed }, ref) => {
  const [foodLevel, setFoodLevel] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  useImperativeHandle(ref, () => ({
    feedHabi: (nutritionAmount) => {
      if (foodLevel < 100) {
        const newLevel = Math.min(100, foodLevel + nutritionAmount);
        const currentTime = Date.now();
        setFoodLevel(newLevel);
        setLastUpdate(currentTime);
        localStorage.setItem('habiFoodLevel', newLevel.toString());
        localStorage.setItem('habiLastUpdate', currentTime.toString());

        if (onFeed) {
          onFeed(nutritionAmount);
        }
      }
    }
  }));

  useEffect(() => {
    // Załaduj dane z localStorage przy starcie
    const savedFoodLevel = localStorage.getItem('habiFoodLevel');
    const savedLastUpdate = localStorage.getItem('habiLastUpdate');

    if (savedFoodLevel && savedLastUpdate) {
      const currentTime = Date.now();
      const timeDiff = currentTime - parseInt(savedLastUpdate);
      const hoursPassed = Math.floor(timeDiff / (1000 * 60 * 60)); // godziny

      let newFoodLevel = parseInt(savedFoodLevel) - (hoursPassed * 5);
      newFoodLevel = Math.max(0, newFoodLevel); // Nie może być poniżej 0

      setFoodLevel(newFoodLevel);
      setLastUpdate(currentTime);

      // Zapisz nowy stan
      localStorage.setItem('habiFoodLevel', newFoodLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());
    } else {
      // Pierwszy raz - ustaw pełny poziom
      const currentTime = Date.now();
      setLastUpdate(currentTime);
      localStorage.setItem('habiFoodLevel', '100');
      localStorage.setItem('habiLastUpdate', currentTime.toString());
    }
  }, []);

  useEffect(() => {
    // Ustaw interval do sprawdzania co minutę
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const savedLastUpdate = localStorage.getItem('habiLastUpdate');

      if (savedLastUpdate) {
        const timeDiff = currentTime - parseInt(savedLastUpdate);

        if (timeDiff >= 1000 * 60 * 60) { // Jeśli minęła godzina
          setFoodLevel(prevLevel => {
            const newLevel = Math.max(0, prevLevel - 5);
            localStorage.setItem('habiFoodLevel', newLevel.toString());
            localStorage.setItem('habiLastUpdate', currentTime.toString());
            return newLevel;
          });
          setLastUpdate(currentTime);
        }
      }
    }, 60000); // Sprawdzaj co minutę

    return () => clearInterval(interval);
  }, []);

  const getFoodBarColor = () => {
    if (foodLevel > 50) return '#4CAF50'; // Zielony
    if (foodLevel > 20) return '#FFC107'; // Żółty
    return '#F44336'; // Czerwony
  };

  const getFoodStatus = () => {
    if (foodLevel > 70) return 'Jestem z Ciebie dumny! 😊';
    if (foodLevel > 50) return 'Nie zapominaj o swoich celach 😌';
    if (foodLevel > 20) return 'Pamiętaj o zanotowaniu nawyków 😐';
    if (foodLevel > 0) return 'Nie poddawaj się 😟';
    return 'Dasz radę to zrobić! 💪';
  };

  const getHabiMood = () => {
    if (foodLevel > 70) return '😄';
    if (foodLevel > 50) return '😊';
    if (foodLevel > 20) return '😐';
    if (foodLevel > 0) return '😟';
    return '😵';
  };

  const getTimeUntilNextHunger = () => {
    const currentTime = Date.now();
    const savedLastUpdate = localStorage.getItem('habiLastUpdate');

    if (savedLastUpdate) {
      const timeDiff = currentTime - parseInt(savedLastUpdate);
      const timeUntilNextHour = (1000 * 60 * 60) - (timeDiff % (1000 * 60 * 60));
      const minutes = Math.floor(timeUntilNextHour / (1000 * 60));
      return minutes;
    }
    return 60;
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
                    <span className="stat-value">{foodLevel}%</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-label">Ostatnie karmienie:</span>
                    <span className="stat-value">{getLastFeedTime()}</span>
                  </div>
                  <div className="info-stat">
                    <span className="stat-label">Następny spadek za:</span>
                    <span className="stat-value">{getTimeUntilNextHunger()} min</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>🎯 Cele i zasady</h4>
                <div className="info-rules">
                  <div className="rule-item">
                    <span className="rule-icon">⏰</span>
                    <span>Spadek sytości: -5% co godzinę</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">🎯</span>
                    <span>Cel: Utrzymaj poziom >50%</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">🍎</span>
                    <span>Kupuj jedzenie za monety</span>
                  </div>
                  <div className="rule-item">
                    <span className="rule-icon">💪</span>
                    <span>Większe porcje = więcej odżywiania</span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>💡 Wskazówki</h4>
                <div className="tips-list">
                  <p>• Regularne karmienie utrzymuje wysoką motywację</p>
                  <p>• Wykonywanie nawyków daje monety na jedzenie</p>
                  <p>• Różne produkty mają różną wartość odżywczą</p>
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
          <span className="food-control-title">Stan Habi</span>
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