import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png';
import { feedAPI } from '../../services/api.jsx';
import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const foodControlRef = useRef(null);

  // Sprawdź stan połączenia
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setError('');
      loadFoods();
      syncOfflinePurchases();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Wczytaj jedzenie przy starcie
  useEffect(() => {
    loadFoods();
  }, []);

  // Synchronizuj monety
  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  // Funkcja ładowania jedzenia z API
  const loadFoods = async () => {
    try {
      setLoading(true);
      setError('');

      if (isOnline) {
        const foods = await feedAPI.getFoods();
        setFoodItems(foods);
        localStorage.setItem('foods_cache', JSON.stringify(foods));
      } else {
        // Offline - użyj cache
        const cachedFoods = localStorage.getItem('foods_cache');
        if (cachedFoods) {
          setFoodItems(JSON.parse(cachedFoods));
          setError('Tryb offline - używam zapisanych danych');
        } else {
          setError('Brak połączenia internetowego');
        }
      }
    } catch (error) {
      console.error('Błąd ładowania jedzenia:', error);

      // Fallback do cache
      const cachedFoods = localStorage.getItem('foods_cache');
      if (cachedFoods) {
        setFoodItems(JSON.parse(cachedFoods));
        setError('Błąd serwera - używam zapisanych danych');
      } else {
        setError('Nie udało się wczytać jedzenia');
      }
    } finally {
      setLoading(false);
    }
  };

  // Synchronizuj offline purchases
  const syncOfflinePurchases = async () => {
    try {
      if (feedAPI.hasOfflinePurchases()) {
        await feedAPI.syncOfflinePurchases();
        await loadFoods();
      }
    } catch (error) {
      console.error('Błąd synchronizacji offline:', error);
    }
  };

  // Funkcja kupowania jedzenia
  const handlePurchase = async (item) => {
    if (currentCoins < item.cost) {
      alert(`Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isOnline) {
        // Online - użyj API
        const result = await feedAPI.feedHabi(item.id);

        // Aktualizuj monety z odpowiedzi serwera
        setCurrentCoins(result.total_coins);
        if (onCoinsUpdate) {
          onCoinsUpdate(result.total_coins);
        }

        // Nakarm Habi
        if (foodControlRef.current) {
          foodControlRef.current.feedHabi(result.nutrition_gained);
        }

        // Pokaż animację
        setPurchaseAnimation({
          itemName: result.food_name,
          nutrition: result.nutrition_gained,
          icon: item.iconImage
        });
        setTimeout(() => setPurchaseAnimation(null), 2000);

      } else {
        // Offline - zapisz do synchronizacji później
        const newCoins = currentCoins - item.cost;
        setCurrentCoins(newCoins);
        if (onCoinsUpdate) {
          onCoinsUpdate(newCoins);
        }

        // Nakarm Habi lokalnie
        if (foodControlRef.current) {
          foodControlRef.current.feedHabi(item.nutrition);
        }

        // Zapisz offline purchase
        const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
        offlinePurchases.push({
          foodId: item.id,
          cost: item.cost,
          nutrition: item.nutrition,
          purchasedAt: new Date().toISOString()
        });
        localStorage.setItem('offline_purchases', JSON.stringify(offlinePurchases));

        // Pokaż animację
        setPurchaseAnimation({
          itemName: item.name,
          nutrition: item.nutrition,
          icon: item.iconImage
        });
        setTimeout(() => setPurchaseAnimation(null), 2000);

        setError('Zakup zapisany offline - zostanie zsynchronizowany gdy połączenie wróci');
      }

    } catch (error) {
      console.error('Błąd zakupu:', error);
      setError('Błąd: ' + error.message);

      // Fallback - offline purchase
      const newCoins = currentCoins - item.cost;
      setCurrentCoins(newCoins);
      if (onCoinsUpdate) {
        onCoinsUpdate(newCoins);
      }

      if (foodControlRef.current) {
        foodControlRef.current.feedHabi(item.nutrition);
      }

      const offlinePurchases = JSON.parse(localStorage.getItem('offline_purchases') || '[]');
      offlinePurchases.push({
        foodId: item.id,
        cost: item.cost,
        nutrition: item.nutrition,
        purchasedAt: new Date().toISOString()
      });
      localStorage.setItem('offline_purchases', JSON.stringify(offlinePurchases));

      setPurchaseAnimation({
        itemName: item.name,
        nutrition: item.nutrition,
        icon: item.iconImage
      });
      setTimeout(() => setPurchaseAnimation(null), 2000);

    } finally {
      setLoading(false);
    }
  };

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

        {/* Error message */}
        {error && (
          <div className="error-message">
            <div>
              {!isOnline && '📶 '}
              {error}
            </div>
            <button onClick={loadFoods} disabled={loading}>
              {isOnline ? 'Odśwież' : 'Sprawdź połączenie'}
            </button>
          </div>
        )}

        {/* Connection status */}
        {!isOnline && (
          <div className="offline-indicator">
            📶 Tryb offline - zakupy będą zsynchronizowane gdy połączenie wróci
          </div>
        )}

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
        {loading && (
          <div className="loading-indicator">
            Ładowanie jedzenia...
          </div>
        )}

        {!loading && foodItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍽️</div>
            <h3>Brak jedzenia</h3>
            <p>Nie udało się wczytać dostępnego jedzenia dla Habi.</p>
            <button onClick={loadFoods} className="retry-btn">
              Spróbuj ponownie
            </button>
          </div>
        ) : (
          <div className="food-items-grid-redesigned">
            {foodItems.map(item => {
              const canAfford = currentCoins >= item.cost;

              return (
                <div
                  key={item.id}
                  className={`food-item-redesigned ${!canAfford ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
                  onClick={() => canAfford && !loading && handlePurchase(item)}
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
        )}

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