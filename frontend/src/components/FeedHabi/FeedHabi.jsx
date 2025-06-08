import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png';
import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [habiStatus, setHabiStatus] = useState({
    hunger_level: 50,
    happiness: 80,
    status_message: "Habi czeka..."
  });
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const foodControlRef = useRef(null);

  // Pobierz listę jedzenia z API
  useEffect(() => {
    fetchFoodItems();
    fetchHabiStatus();
  }, []);

  const fetchFoodItems = async () => {
    try {
      const response = await fetch('/api/food-items');
      const data = await response.json();
      setFoodItems(data.food_items);
    } catch (error) {
      console.error('Błąd pobierania listy jedzenia:', error);
      // Fallback do domyślnej listy
      setFoodItems([
        { id: 1, name: "Woda", cost: 1, icon: "💧", nutrition: 5 },
        { id: 2, name: "Banan", cost: 3, icon: "🍌", nutrition: 15 },
        { id: 3, name: "Jabłko", cost: 3, icon: "🍎", nutrition: 15 },
        { id: 4, name: "Mięso", cost: 8, icon: "🥩", nutrition: 25 },
        { id: 5, name: "Sałatka", cost: 8, icon: "🥗", nutrition: 25 },
        { id: 6, name: "Kawa", cost: 20, icon: "☕", nutrition: 40 }
      ]);
    }
  };

  const fetchHabiStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/habi/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setHabiStatus(data);
    } catch (error) {
      console.error('Błąd pobierania statusu Habi:', error);
    }
  };

  const handlePurchase = async (item) => {
    if (currentCoins < item.cost) {
      alert(`Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/habi/feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          food_id: item.id,
          quantity: 1
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Aktualizuj monety
        setCurrentCoins(data.remaining_coins);
        onCoinsUpdate(data.remaining_coins);

        // Aktualizuj status Habi
        setHabiStatus(data.habi_status);

        // Nakarm Habi wizualnie
        if (foodControlRef.current) {
          foodControlRef.current.feedHabi(data.food_consumed.nutrition);
        }

        // Pokaż animację zakupu
        setPurchaseAnimation({
          itemName: data.food_consumed.name,
          nutrition: data.food_consumed.nutrition,
          icon: data.food_consumed.icon || item.icon,
          message: data.message
        });

        setTimeout(() => setPurchaseAnimation(null), 3000);

      } else {
        alert(data.detail || 'Błąd podczas karmienia Habi');
      }
    } catch (error) {
      console.error('Błąd karmienia:', error);
      alert('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  // Odśwież status Habi co minutę
  useEffect(() => {
    const interval = setInterval(fetchHabiStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Funkcja do określenia koloru paska głodu
  const getHungerBarColor = (level) => {
    if (level < 20) return '#ff4444';
    if (level < 40) return '#ff8800';
    if (level < 70) return '#ffdd00';
    return '#44ff44';
  };

  return (
    <div className="feed-habi">
      <div className="feed-habi-container">
        {/* Header */}
        <div className="feed-header">
          <div className="feed-header-left">
            <button className="feed-back-btn" onClick={onBack} disabled={loading}>
              ←
            </button>
            <img src={HabiLogo} alt="Habi" className="habi-logo" />
          </div>
          <div className="feed-coins-display">
            <span>🪙</span>
            <span>{currentCoins}</span>
          </div>
        </div>

        {/* Habi Status Bar */}
        <div className="habi-status-section">
          <div className="status-message">
            {habiStatus.status_message}
          </div>
          <div className="status-bars">
            <div className="status-bar">
              <span className="status-label">Głód: {habiStatus.hunger_level}%</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${habiStatus.hunger_level}%`,
                    backgroundColor: getHungerBarColor(habiStatus.hunger_level)
                  }}
                ></div>
              </div>
            </div>
            <div className="status-bar">
              <span className="status-label">Szczęście: {habiStatus.happiness}%</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${habiStatus.happiness}%`,
                    backgroundColor: '#ff69b4'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Animation */}
        {purchaseAnimation && (
          <div className="purchase-animation">
            <div className="purchase-popup">
              <div className="purchase-icon">{purchaseAnimation.icon}</div>
              <div className="purchase-text">
                {purchaseAnimation.message}
              </div>
              <div className="purchase-nutrition">
                +{purchaseAnimation.nutrition} odżywiania dla Habi
              </div>
            </div>
          </div>
        )}

        {/* Food Items Grid */}
        <div className="food-items-grid-redesigned">
          {foodItems.map(item => {
            const canAfford = currentCoins >= item.cost && !loading;

            return (
              <div
                key={item.id}
                className={`food-item-redesigned ${!canAfford ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
                onClick={() => canAfford && handlePurchase(item)}
              >
                <div className="food-item-image">
                  <span className="food-emoji">{item.icon}</span>
                </div>
                <div className="food-item-info">
                  <div className="food-item-name">{item.name}</div>
                  <div className="food-item-nutrition">+{item.nutrition} 🍽️</div>
                </div>
                <div className="food-item-price">
                  <span className="coin-icon">🪙</span>
                  <span className="price-value">{item.cost}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Habi Character Section */}
        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={HabiHappyAdult} alt="Habi" className="habi-image" />
          </div>

          {/* Food Control on the side */}
          <div className="food-control-side">
            <FoodControl ref={foodControlRef} />
          </div>
        </div>

        {/* Tips */}
        <div className="feed-tips">
          <div className="tip-card">
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>Wskazówka:</strong> Kliknij na jedzenie aby nakarmić Habi!
              Pamiętaj - Habi głodnieje z czasem, więc wracaj regularnie.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedHabi;