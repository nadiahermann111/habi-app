import React, { useState, useEffect, useRef } from 'react';
import FoodControl from '../FoodControl/FoodControl';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png';

// ✅ STATYCZNE IMPORTY WSZYSTKICH OBRAZKÓW
import HabiAdultHappy from '../HabiClothes/HabiAdultHappy.png';
import HabiPiercingHappy from '../HabiClothes/HabiPiercingHappy.png';
import HabiBowHappy from '../HabiClothes/HabiBowHappy.png';
import HabiLeopardHappy from '../HabiClothes/HabiLeopardHappy.png';
import HabiFlowerHappy from '../HabiClothes/HabiFlowerHappy.png';
import HabiTattooHappy from '../HabiClothes/HabiTattooHappy.png';
import HabiLoveHappy from '../HabiClothes/HabiLoveHappy.png';
import HabiBananaHappy from '../HabiClothes/HabiBananaHappy.png';
import HabiJeansHappy from '../HabiClothes/HabiJeansHappy.png';
import HabiShrekHappy from '../HabiClothes/HabiShrekHappy.png';
import HabiPlayboyHappy from '../HabiClothes/HabiPlayboyHappy.png';

// 🔊 IMPORTY DŹWIĘKÓW JEDZENIA
import Food1Sound from '../Sounds/Food1.mp3';
import Food2Sound from '../Sounds/Food2.mp3';
import Food3Sound from '../Sounds/Food3.mp3';
import Food4Sound from '../Sounds/Food4.mp3';
import Food5Sound from '../Sounds/Food5.mp3';
import Food6Sound from '../Sounds/Food6.mp3';
import Food7Sound from '../Sounds/Food7.mp3';
import Food8Sound from '../Sounds/Food8.mp3';
import Food9Sound from '../Sounds/Food9.mp3';
import Food10Sound from '../Sounds/Food10.mp3';
import Food11Sound from '../Sounds/Food11.mp3';
import Food12Sound from '../Sounds/Food12.mp3';
import Food13Sound from '../Sounds/Food13.mp3';
import Food14Sound from '../Sounds/Food14.mp3';
import Food15Sound from '../Sounds/Food15.mp3';
import Food16Sound from '../Sounds/Food16.mp3';
import Food17Sound from '../Sounds/Food17.mp3';
import Food18Sound from '../Sounds/Food18.mp3';
import Food19Sound from '../Sounds/Food19.mp3';
import Food20Sound from '../Sounds/Food20.mp3';
import Food21Sound from '../Sounds/Food21.mp3';
import Food22Sound from '../Sounds/Food22.mp3';

import './FeedHabi.css';

const FeedHabi = ({ onBack, userCoins, onCoinsUpdate, currentClothing }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [error, setError] = useState(null);
  const [processingItemId, setProcessingItemId] = useState(null);
  const foodControlRef = useRef(null);

  const clothingImages = {
    1: HabiPiercingHappy,
    2: HabiBowHappy,
    3: HabiLeopardHappy,
    4: HabiFlowerHappy,
    5: HabiTattooHappy,
    6: HabiLoveHappy,
    7: HabiBananaHappy,
    8: HabiJeansHappy,
    9: HabiShrekHappy,
    10: HabiPlayboyHappy
  };

  const foodSounds = [
    Food1Sound, Food2Sound, Food3Sound, Food4Sound, Food5Sound,
    Food6Sound, Food7Sound, Food8Sound, Food9Sound, Food10Sound,
    Food11Sound, Food12Sound, Food13Sound, Food14Sound, Food15Sound,
    Food16Sound, Food17Sound, Food18Sound, Food19Sound, Food20Sound,
    Food21Sound, Food22Sound
  ];

  const playRandomFoodSound = () => {
    try {
      const randomIndex = Math.floor(Math.random() * foodSounds.length);
      const soundFile = foodSounds[randomIndex];

      if (soundFile) {
        const audio = new Audio(soundFile);
        audio.volume = 0.6; // głośność 60%
        audio.play().catch(err => console.log('🔇 Nie udało się odtworzyć dźwięku:', err));
        console.log(`🔊 Odtwarzam Food${randomIndex + 1}.mp3`);
      }
    } catch (error) {
      console.log('🔇 Błąd odtwarzania:', error);
    }
  };

  // ✅ FUNKCJA ZWRACAJĄCA OBRAZEK
  const getHabiImage = () => {
    if (!currentClothing) return HabiAdultHappy;
    return clothingImages[currentClothing] || HabiAdultHappy;
  };

  const foodItems = [
    { id: 1, cost: 1, icon: "💧", nutrition: 5, name: "Woda" },
    { id: 2, cost: 3, icon: "🍌", nutrition: 15, name: "Banan" },
    { id: 3, cost: 3, icon: "🍎", nutrition: 15, name: "Jabłko" },
    { id: 4, cost: 8, icon: "🥩", nutrition: 25, name: "Mięso" },
    { id: 5, cost: 8, icon: "🥗", nutrition: 25, name: "Sałatka" },
    { id: 6, cost: 20, icon: "☕", nutrition: 40, name: "Kawa" }
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
    if (processingItemId) {
      console.log('⏳ Transakcja w toku, czekaj...');
      return;
    }

    console.log(`🛒 Próba zakupu ${item.name} za ${item.cost} monet`);
    setError(null);

    if (currentCoins < item.cost) {
      const errorMsg = `Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`;
      setError(errorMsg);
      return;
    }

    setProcessingItemId(item.id);

    try {
      const result = await spendCoins(item.cost);

      if (result.success) {
        console.log(`✅ Zakup udany! Pozostało monet: ${result.remainingCoins}`);

        playRandomFoodSound();

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

        setTimeout(() => setPurchaseAnimation(null), 1500);

      } else {
        console.error('❌ Zakup nieudany:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      const errorMsg = 'Błąd podczas zakupu - sprawdź połączenie internetowe';
      setError(errorMsg);
    } finally {
      // zawsze resetuj processingItemId
      setProcessingItemId(null);
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
            <button className="feed-back-btn" onClick={onBack} disabled={processingItemId}>
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

        <div className="food-items-grid-redesigned">
          {foodItems.map(item => {
            // Item jest disabled jeśli: brak monet lub ten konkretny item jest przetwarzany
            const isProcessing = processingItemId === item.id;
            const canAfford = currentCoins >= item.cost;
            const isDisabled = !canAfford || isProcessing;

            return (
              <div
                key={item.id}
                className={`food-item-redesigned ${isDisabled ? 'disabled' : ''}`}
                onClick={() => !isDisabled && handlePurchase(item)}
                style={{
                  pointerEvents: isDisabled ? 'none' : 'auto',
                  opacity: isProcessing ? 0.6 : 1
                }}
              >
                <div className="food-item-image">
                  <span className="food-emoji">{item.icon}</span>
                </div>
                <div className="food-item-price">
                  <span className="coin-icon">🪙</span>
                  <span className="price-value">{item.cost}</span>
                </div>
                {isDisabled && (
                  <div className="food-item-overlay">
                    <span>
                      {isProcessing ? 'Kupowanie...' : !canAfford ? 'Brak monet' : 'Czekaj...'}
                    </span>
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