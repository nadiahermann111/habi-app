import { useState, useEffect } from 'react';
import './FoodControl.css';

const FoodControl = () => {
  const [foodLevel, setFoodLevel] = useState(100);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

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
  }, []); // Usuń lastUpdate z dependency array - uruchom tylko raz przy mount

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
  }, []); // Dependency array puste - uruchom tylko raz

  const getFoodBarColor = () => {
    if (foodLevel > 50) return '#4CAF50'; // Zielony
    if (foodLevel > 20) return '#FFC107'; // Żółty
    return '#F44336'; // Czerwony
  };

  const getFoodStatus = () => {
    if (foodLevel > 70) return 'Jestem z Ciebie dumny!';
    if (foodLevel > 50) return 'Nie zapominaj o swoich celach';
    if (foodLevel > 20) return 'Pamiętaj o zanotowaniu nawyków 😐';
    if (foodLevel > 0) return 'Nie poddawaj się 😟';
    return 'Dasz radę to zrobić!';
  };

  const feedHabi = () => {
    if (foodLevel < 100) {
      const newLevel = Math.min(100, foodLevel + 20);
      const currentTime = Date.now();
      setFoodLevel(newLevel);
      setLastUpdate(currentTime);
      localStorage.setItem('habiFoodLevel', newLevel.toString());
      localStorage.setItem('habiLastUpdate', currentTime.toString());
    }
  };

  return (
    <div className="food-control">
      <div className="food-header">
        <span className="food-status">{getFoodStatus()}</span>
      </div>

      <div className="food-bar-container">
        <div className="food-bar-background">
          <div
            className="food-bar-fill"
            style={{
              width: `${foodLevel}%`,
              backgroundColor: getFoodBarColor()
            }}
          />
        </div>
        <span className="food-percentage">{foodLevel}%</span>
      </div>

      <button onClick={feedHabi} className="feed-button">
        Nakarm Habi (+20%)
      </button>
    </div>
  );
};

export default FoodControl;