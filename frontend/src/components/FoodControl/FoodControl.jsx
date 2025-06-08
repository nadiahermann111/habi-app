import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import './FoodControl.css';

const FoodControl = forwardRef(({ onFeed }, ref) => {
  const [foodLevel, setFoodLevel] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

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

  const feedHabiDirect = () => {
    if (foodLevel < 100) {
      const newLevel = Math.min(100, foodLevel + 20);
      const currentTime = Date.now();
      setFoodLevel(newLevel);
      setLastUpdate(currentTime);
      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());

      if (onFeed) {
        onFeed(20);
      }
    }
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

  return (
    <div className="food-control">
      <div className="habi-character">
        <div className="habi-face">
          <span className="habi-mood">{getHabiMood()}</span>
        </div>
        <div className="habi-name">Habi</div>
      </div>

      <div className="food-status-section">
        <div className="food-status">{getFoodStatus()}</div>
        <div className="next-hunger">
          Następny spadek za {getTimeUntilNextHunger()} min
        </div>
      </div>

      <div className="food-bar-container">
        <div className="food-bar-label">
          <span>Poziom sytości</span>
          <span className="food-percentage">{foodLevel}%</span>
        </div>
        <div className="food-bar-background">
          <div
            className="food-bar-fill"
            style={{
              width: `${foodLevel}%`,
              backgroundColor: getFoodBarColor(),
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>

      <div className="feed-actions">
        <button
          onClick={feedHabiDirect}
          className={`feed-button ${foodLevel >= 100 ? 'disabled' : ''}`}
          disabled={foodLevel >= 100}
        >
          <span className="feed-icon">🍽️</span>
          Nakarm Habi (+20%)
        </button>

        <div className="feed-tip">
          💡 Kup jedzenie powyżej aby nakarmić Habi bardziej efektywnie!
        </div>
      </div>

      <div className="food-stats">
        <div className="stat-item">
          <span className="stat-icon">⏰</span>
          <div className="stat-info">
            <div className="stat-label">Spadek co godzinę</div>
            <div className="stat-value">-5%</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">🎯</span>
          <div className="stat-info">
            <div className="stat-label">Cel</div>
            <div className="stat-value">Utrzymaj >50%</div>
          </div>
        </div>
      </div>
    </div>
  );
});

FoodControl.displayName = 'FoodControl';

export default FoodControl;