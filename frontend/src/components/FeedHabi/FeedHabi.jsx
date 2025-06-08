import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png'; // Dodaj ten import
import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const foodControlRef = useRef(null);

  const foodItems = [
    { id: 1, name: "Woda", cost: 1, icon: "💧", nutrition: 5, iconImage: "🥤" },
    { id: 2, name: "Banan", cost: 3, icon: "🍌", nutrition: 15, iconImage: "🍌" },
    { id: 3, name: "Jabłko", cost: 3, icon: "🍎", nutrition: 15, iconImage: "🍎" },
    { id: 4, name: "Mięso", cost: 8, icon: "🥩", nutrition: 25, iconImage: "🥩" },
    { id: 5, name: "Sałatka", cost: 8, icon: "🥗", nutrition: 25, iconImage: "🥗" },
    { id: 6, name: "Kawa", cost: 20, icon: "☕", nutrition: 40, iconImage: "☕" }
  ];

  const handlePurchase = (item) => {
    if (currentCoins >= item.cost) {
      const newAmount = currentCoins - item.cost;
      setCurrentCoins(newAmount);
      onCoinsUpdate(newAmount);

      // Nakarm Habi
      if (foodControlRef.current) {
        foodControlRef.current.feedHabi(item.nutrition);
      }

      // Pokaż animację
      setPurchaseAnimation({
        itemName: item.name,
        nutrition: item.nutrition,
        icon: item.iconImage
      });
      setTimeout(() => setPurchaseAnimation(null), 2000);

    } else {
      alert(`Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`);
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
            <button className="feed-back-btn" onClick={onBack}>
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
                {purchaseAnimation.itemName} kupione!
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
            const canAfford = currentCoins >= item.cost;

            return (
              <div
                key={item.id}
                className={`food-item-redesigned ${!canAfford ? 'disabled' : ''}`}
                onClick={() => canAfford && handlePurchase(item)}
              >
                <div className="food-item-image">
                  <span className="food-emoji">{item.iconImage}</span>
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
              <strong>Wskazówka:</strong> Kliknij na jedzenie aby nakarmić Habi i podnieść jego poziom sytości!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedHabi;