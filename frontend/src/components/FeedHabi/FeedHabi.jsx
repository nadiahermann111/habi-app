import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png';
import HabiHappyAdult from '../HabiClothes/HabiAdultHappy.png'; // ← DODAJ DOMYŚLNY OBRAZEK
import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate, currentClothing }) => { // ← DODAJ PROP
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const foodControlRef = useRef(null);

  // ← DYNAMICZNY OBRAZEK HABI
  const getHabiImage = () => {
    if (!currentClothing) return HabiHappyAdult;

    try {
      // Mapowanie ID na nazwy plików
      const clothingMap = {
        1: 'HabiPiercingHappy.png',
        2: 'HabiBowHappy.png',
        3: 'HabiLeopardHappy.png',
        4: 'HabiFlowerHappy.png',
        5: 'HabiTattooHappy.png',
        6: 'HabiLoveHappy.png',
        7: 'HabiBananaHappy.png',
        8: 'HabiJeansHappy.png',
        9: 'HabiShrekHappy.png',
        10: 'HabiPlayboyHappy.png'
      };

      const fileName = clothingMap[currentClothing];
      if (fileName) {
        return require(`../HabiClothes/${fileName}`);
      }
    } catch (error) {
      console.error('Błąd wczytywania obrazka:', error);
    }

    return HabiHappyAdult;
  };

  const foodItems = [
    { id: 1, cost: 1, icon: "💧", nutrition: 5 },
    { id: 2, cost: 3, icon: "🍌", nutrition: 15 },
    { id: 3, cost: 3, icon: "🍎", nutrition: 15 },
    { id: 4, cost: 8, icon: "🥩", nutrition: 25 },
    { id: 5, cost: 8, icon: "🥗", nutrition: 25 },
    { id: 6, cost: 20, icon: "☕", nutrition: 40 }
  ];

  const API_BASE_URL = 'https://habi-backend.onrender.com';

  const spendCoins = async (amount) => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Brak tokenu autoryzacji');
      }

      console.log(`🔄 Wydawanie ${amount} monet za jedzenie...`);

      const response = await fetch(`${API_BASE_URL}/api/coins/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: -amount })
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
          error: data.detail || data.message || 'Błąd wydawania monet'
        };
      }
    } catch (error) {
      console.error('❌ Błąd spendCoins:', error);
      return {
        success: false,
        error: error.message || 'Błąd połączenia z serwerem'
      };
    }
  };

  const handlePurchase = async (item) => {
    console.log(`🛒 Próba zakupu ${item.name} za ${item.cost} monet`);
    setError(null);

    if (currentCoins < item.cost) {
      const errorMsg = `Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`;
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setLoading(true);

    try {
      const result = await spendCoins(item.cost);

      if (result.success) {
        console.log(`✅ Zakup udany! Pozostało monet: ${result.remainingCoins}`);

        setCurrentCoins(result.remainingCoins);
        if (onCoinsUpdate) {
          onCoinsUpdate(result.remainingCoins);
        }

        window.dispatchEvent(new CustomEvent('coinsUpdated', {
          detail: { coins: result.remainingCoins }
        }));

        if (foodControlRef.current) {
          foodControlRef.current.feedHabi(item.nutrition);
        }

        setPurchaseAnimation({
          itemName: item.name,
          nutrition: item.nutrition,
          icon: item.icon,
          cost: item.cost
        });

        setTimeout(() => setPurchaseAnimation(null), 3000);

      } else {
        console.error('❌ Zakup nieudany:', result.error);
        setError(result.error);
        alert(result.error || 'Błąd podczas zakupu');
      }
    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      const errorMsg = 'Błąd podczas zakupu - sprawdź połączenie internetowe';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCoinsUpdate = (newCoins) => {
    setCurrentCoins(newCoins);
    if (onCoinsUpdate) {
      onCoinsUpdate(newCoins);
    }
  };

  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  return (
    <div className="feed-habi">
      <div className="feed-habi-container">
        <div className="feed-header">
          <div className="feed-header-left">
            <button className="feed-back-btn" onClick={onBack} disabled={loading}>
              ←
            </button>
            <img src={HabiLogo} alt="Habi" className="habi-logo-m" />
          </div>

          <div className="feed-coins-display">
            <CoinSlot
              initialCoins={currentCoins}
              onCoinsUpdate={handleCoinsUpdate}
              size="medium"
              showRefreshButton={true}
              autoRefresh={false}
              animated={true}
            />
          </div>
        </div>

        {error && (
          <div className="error-message" style={{
            background: '#ffe6e6',
            border: '1px solid #ff9999',
            borderRadius: '8px',
            padding: '10px',
            margin: '10px 0',
            color: '#cc0000'
          }}>
            ❌ {error}
          </div>
        )}

        {purchaseAnimation && (
          <div className="purchase-animation">
            <div className="purchase-popup">
              <div className="purchase-icon">{purchaseAnimation.icon}</div>
              <div className="purchase-text">
                {purchaseAnimation.itemName} Kupione za {purchaseAnimation.cost} monet!
              </div>
              <div className="purchase-nutrition">
                +{purchaseAnimation.nutrition} odżywiania dla Habi
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="loading-indicator" style={{
            textAlign: 'center',
            padding: '10px',
            background: '#f0f8ff',
            borderRadius: '8px',
            margin: '10px 0'
          }}>
            🔄 Przetwarzanie zakupu...
          </div>
        )}

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

        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={getHabiImage()} alt="Habi" className="habi-image" />
          </div>

          <div className="food-control-side">
            <FoodControl ref={foodControlRef} />
          </div>
        </div>

        <div className="feed-tips">
          <div className="tip-card">
            <span className="tip-icon">💡</span>
            <div className="tip-content">
              <strong>Wskazówka:</strong> Kliknij na jedzenie aby wydać monety i nakarmić Habi!
              Stan sytości zmniejsza się z czasem, jeśli nie wykonujesz swoich nowych nawyków - Habi będzie smutna i głodna.
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