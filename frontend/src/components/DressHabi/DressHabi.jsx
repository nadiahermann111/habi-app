import React, { useState, useEffect } from 'react';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png';
import './DressHabi.css';

const DressHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ownedClothes, setOwnedClothes] = useState([]);

  // Tablica dostępnych ubranek z ich właściwościami
  const clothingItems = [
    { id: 1, name: 'Kokardka', cost: 50, icon: "🎀", category: 'Dodatki' },
    { id: 2, name: 'Opaska w Panterke', cost: 70, icon: "🐆", category: 'Dodatki' },
    { id: 3, name: 'Kwiatek Hibiskus', cost: 70, icon: "🌺", category: 'Dodatki' },
    { id: 4, name: 'Kolczyki', cost: 50, icon: "💎", category: 'Biżuteria' },
    { id: 5, name: 'Tatuaże', cost: 100, icon: "🦋", category: 'Dekoracje' },
    { id: 6, name: 'Koszulka i❤️ Habi', cost: 150, icon: "👕", category: 'Ubrania' },
    { id: 7, name: 'Koszulka Banan', cost: 150, icon: "🍌", category: 'Ubrania' },
    { id: 8, name: 'Ogrodniczki', cost: 200, icon: "👗", category: 'Ubrania' }
  ];

  // Funkcja obsługująca zakup ubranka (na razie bez API)
  const handlePurchase = async (item) => {
    console.log(`🛒 Próba zakupu ${item.name} za ${item.cost} monet`);
    setError(null);

    // Sprawdzenie czy przedmiot został już kupiony
    if (ownedClothes.includes(item.id)) {
      const errorMsg = `Już posiadasz ${item.name}!`;
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    // Sprawdzenie czy użytkownik ma wystarczającą liczbę monet
    if (currentCoins < item.cost) {
      const errorMsg = `Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`;
      setError(errorMsg);
      alert(errorMsg);
      return;
    }

    setLoading(true);

    try {
      // Symulacja opóźnienia zakupu (na razie bez API)
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(`✅ Zakup udany! ${item.name} kupione!`);

      // Aktualizacja lokalnego stanu monet
      const newCoins = currentCoins - item.cost;
      setCurrentCoins(newCoins);
      if (onCoinsUpdate) {
        onCoinsUpdate(newCoins);
      }

      // Dodanie przedmiotu do posiadanych
      setOwnedClothes([...ownedClothes, item.id]);

      // Zapisanie posiadanych ubranek w localStorage
      const updatedOwned = [...ownedClothes, item.id];
      localStorage.setItem('ownedClothes', JSON.stringify(updatedOwned));

      // Wysłanie globalnego eventu o zmianie liczby monet
      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: newCoins }
      }));

      // Wyświetlenie animacji potwierdzającej zakup
      setPurchaseAnimation({
        itemName: item.name,
        icon: item.icon,
        cost: item.cost
      });

      // Ukrycie animacji po 3 sekundach
      setTimeout(() => setPurchaseAnimation(null), 3000);

    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      const errorMsg = 'Błąd podczas zakupu';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja synchronizująca lokalny stan monet z danymi z parent komponentu
  const handleCoinsUpdate = (newCoins) => {
    setCurrentCoins(newCoins);
    if (onCoinsUpdate) {
      onCoinsUpdate(newCoins);
    }
  };

  // Synchronizacja stanu monet przy zmianie propsa userCoins
  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  // Wczytanie posiadanych ubranek z localStorage przy montowaniu komponentu
  useEffect(() => {
    const saved = localStorage.getItem('ownedClothes');
    if (saved) {
      setOwnedClothes(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="dress-habi">
      <div className="dress-habi-container">
        {/* Nagłówek z przyciskiem powrotu i logo */}
        <div className="dress-header">
          <div className="dress-header-left">
            <button className="dress-back-btn" onClick={onBack} disabled={loading}>
              ←
            </button>
            <h2>garderoba</h2>
            <img src={HabiLogo} alt="Habi" className="habi-logo-m" />
          </div>

          {/* Komponent wyświetlający liczbę monet użytkownika */}
          <div className="dress-coins-display">
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

        {/* Wyświetlenie komunikatu błędu jeśli wystąpił */}
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

        {/* Animacja potwierdzenia zakupu */}
        {purchaseAnimation && (
          <div className="purchase-animation">
            <div className="purchase-popup">
              <div className="purchase-icon">{purchaseAnimation.icon}</div>
              <div className="purchase-text">
                {purchaseAnimation.itemName} Kupione za {purchaseAnimation.cost} monet!
              </div>
              <div className="purchase-subtitle">
                Dodano do garderoby! 🎉
              </div>
            </div>
          </div>
        )}

        {/* Wskaźnik ładowania podczas przetwarzania zakupu */}
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

        {/* Siatka dostępnych ubranek */}
        <div className="clothing-items-grid">
          {clothingItems.map(item => {
            const canAfford = currentCoins >= item.cost && !loading;
            const isOwned = ownedClothes.includes(item.id);

            return (
              <div
                key={item.id}
                className={`clothing-item ${!canAfford && !isOwned ? 'disabled' : ''} ${loading ? 'loading' : ''} ${isOwned ? 'owned' : ''}`}
                onClick={() => !isOwned && canAfford && handlePurchase(item)}
              >
                <div className="clothing-item-image">
                  <span className="clothing-emoji">{item.icon}</span>
                </div>
                <div className="clothing-item-price">
                  <span className="coin-icon">🪙</span>
                  <span className="price-value">{item.cost}</span>
                </div>
                <p className="clothing-item-name">{item.name}</p>

                {/* Overlay dla niedostępnych przedmiotów */}
                {!canAfford && !isOwned && (
                  <div className="clothing-item-overlay">
                    <span>{loading ? 'Kupowanie...' : 'Brak monet'}</span>
                  </div>
                )}

                {/* Badge dla posiadanych przedmiotów */}
                {isOwned && (
                  <div className="clothing-item-overlay owned-overlay">
                    <span>✅ Posiadane</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sekcja z avatarem Habi */}
        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={HabiHappyAdult} alt="Habi" className="habi-image" />
          </div>

          <div className="wardrobe-info">
            <h3>Twoja Garderoba</h3>
            <p>Posiadasz {ownedClothes.length} z {clothingItems.length} ubranek</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(ownedClothes.length / clothingItems.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sekcja z poradami dla użytkownika */}
        <div className="dress-tips">
          <div className="tip-card">
            <span className="tip-icon">👗</span>
            <div className="tip-content">
              <strong>Wskazówka:</strong> Kliknij na ubranka aby wydać monety i rozbudować garderobę Habi!
              Każdy przedmiot możesz kupić tylko raz.
            </div>
          </div>

          {/* Ostrzeżenie o niskiej liczbie monet */}
          {currentCoins < 50 && (
            <div className="tip-card warning">
              <span className="tip-icon">⚠️</span>
              <div className="tip-content">
                <strong>Uwaga:</strong> Masz mało monet! Wykonaj więcej nawyków aby zdobyć monety i kupić więcej ubranek.
              </div>
            </div>
          )}

          {/* Gratulacje za kompletną garderobę */}
          {ownedClothes.length === clothingItems.length && (
            <div className="tip-card success">
              <span className="tip-icon">🎉</span>
              <div className="tip-content">
                <strong>Gratulacje!</strong> Zdobyłeś całą garderobę dla Habi!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DressHabi;
