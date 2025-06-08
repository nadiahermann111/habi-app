// Poprawiony FeedHabi.js - używa /api/coins/add z ujemną wartością
import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png';
import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const foodControlRef = useRef(null);

  const foodItems = [
    { id: 1, name: "Woda", cost: 1, icon: "💧", nutrition: 5 },
    { id: 2, name: "Banan", cost: 3, icon: "🍌", nutrition: 15 },
    { id: 3, name: "Jabłko", cost: 3, icon: "🍎", nutrition: 15 },
    { id: 4, name: "Mięso", cost: 8, icon: "🥩", nutrition: 25 },
    { id: 5, name: "Sałatka", cost: 8, icon: "🥗", nutrition: 25 },
    { id: 6, name: "Kawa", cost: 20, icon: "☕", nutrition: 40 }
  ];

  // Funkcja do wydawania monet używając istniejącego endpointu
  const spendCoins = async (amount) => {
    try {
      const token = localStorage.getItem('token');

      // Użyj pełnego URL z domeną render.com
      const baseUrl = window.location.hostname.includes('localhost')
        ? 'http://localhost:10000'
        : 'https://habi-backend.onrender.com';

      console.log(`🔄 Wydawanie ${amount} monet za jedzenie...`);

      const response = await fetch(`${baseUrl}/api/coins/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: -amount }) // Ujemna wartość = wydawanie
      });

      const data = await response.json();
      console.log('📦 Odpowiedź serwera:', data);

      if (response.ok) {
        return {
          success: true,
          remainingCoins: data.coins
        };
      } else {
        console.error('❌ Błąd serwera:', data);
        return {
          success: false,
          error: data.detail || 'Błąd wydawania monet'
        };
      }
    } catch (error) {
      console.error('❌ Błąd spendCoins:', error);
      return {
        success: false,
        error: 'Błąd połączenia z serwerem'
      };
    }
  };

  const handlePurchase = async (item) => {
    console.log(`🛒 Próba zakupu ${item.name} za ${item.cost} monet`);

    if (currentCoins < item.cost) {
      alert(`Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`);
      return;
    }

    setLoading(true);

    try {
      // Wydaj monety przez backend
      const result = await spendCoins(item.cost);

      if (result.success) {
        console.log(`✅ Zakup udany! Pozostało monet: ${result.remainingCoins}`);

        // Aktualizuj monety lokalnie
        setCurrentCoins(result.remainingCoins);
        if (onCoinsUpdate) {
          onCoinsUpdate(result.remainingCoins);
        }

        // Nakarm Habi lokalnie
        if (foodControlRef.current) {
          foodControlRef.current.feedHabi(item.nutrition);
        }

        // Pokaż animację zakupu
        setPurchaseAnimation({
          itemName: item.name,
          nutrition: item.nutrition,
          icon: item.icon,
          cost: item.cost
        });

        setTimeout(() => setPurchaseAnimation(null), 3000);

      } else {
        console.error('❌ Zakup nieudany:', result.error);
        alert(result.error || 'Błąd podczas zakupu');
      }
    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      alert('Błąd podczas zakupu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

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

        {/* Purchase Animation */}
        {purchaseAnimation && (
          <div className="purchase-animation">
            <div className="purchase-popup">
              <div className="purchase-icon">{purchaseAnimation.icon}</div>
              <div className="purchase-text">
                {purchaseAnimation.itemName} kupione za {purchaseAnimation.cost} monet!
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
                {!canAfford && (
                  <div className="food-item-overlay">
                    <span>{loading ? 'Kupowanie...' : 'Brak monet'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Habi Character Section */}
        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={HabiHappyAdult} alt="Habi" className="habi-image" />
          </div>

          {/* Food Control */}
          <div className="food-control-side">
            <FoodControl ref={foodControlRef} />
          </div>
        </div>

        {/* Tips */}
        <div className="feed-tips">
          <div className="tip-card">
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>Wskazówka:</strong> Kliknij na jedzenie aby wydać monety i nakarmić Habi!
              Stan sytości zmniejsza się z czasem.
            </div>
          </div>

          {currentCoins < 8 && (
            <div className="tip-card warning">
              <span className="tip-icon">⚠️</span>
              <div className="tip-content">
                <strong>Uwaga:</strong> Masz mało monet! Wykonaj więcej nawyków aby zdobyć monety.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedHabi;