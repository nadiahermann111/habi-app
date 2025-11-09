import React, { useState, useEffect } from 'react';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiHappyAdult from './HabiAdultHappy.png';
import HabiLogo from './habi-logo.png';
import './DressHabi.css';

const DressHabi = ({ onBack, userCoins, onCoinsUpdate }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [loading, setLoading] = useState(true); // Zmieniono na true
  const [error, setError] = useState(null);
  const [ownedClothes, setOwnedClothes] = useState([]);
  const [clothingItems, setClothingItems] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);

  const API_BASE_URL = 'https://habi-backend.onrender.com';

  // Pobieranie dostępnych ubrań z backendu
  const fetchClothingItems = async () => {
    try {
      console.log('🔄 Rozpoczynam pobieranie ubrań...');
      const response = await fetch(`${API_BASE_URL}/api/clothing`);

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Pobrano ubrania:', data);

      if (Array.isArray(data) && data.length > 0) {
        setClothingItems(data);
      } else {
        console.warn('⚠️ Brak ubrań w odpowiedzi');
        // Użyj fallback danych jeśli backend nie zwraca danych
        setClothingItems([
          { id: 1, name: 'Kolczyki', cost: 50, icon: "💎", category: 'Biżuteria' },
          { id: 2, name: 'Kokardka', cost: 50, icon: "🎀", category: 'Dodatki' },
          { id: 3, name: 'Opaska w Panterke', cost: 70, icon: "🐆", category: 'Dodatki' },
          { id: 4, name: 'Kwiatek Hibiskus', cost: 70, icon: "🌺", category: 'Dodatki' },
          { id: 5, name: 'Tatuaże', cost: 100, icon: "🦋", category: 'Dekoracje' },
          { id: 6, name: 'Koszulka i❤️ Habi', cost: 150, icon: "👕", category: 'Ubrania' },
          { id: 7, name: 'Koszulka Banan', cost: 150, icon: "🍌", category: 'Ubrania' },
          { id: 8, name: 'Ogrodniczki', cost: 200, icon: "👗", category: 'Ubrania' },
          { id: 9, name: 'Tajemnicza opcja', cost: 300, icon: "❓", category: 'Specjalne' },
          { id: 10, name: 'Strój Playboy', cost: 500, icon: "🐰", category: 'Premium' }
        ]);
      }
    } catch (error) {
      console.error('❌ Błąd fetchClothingItems:', error);
      setError(`Nie udało się pobrać listy ubrań: ${error.message}`);

      // Użyj fallback danych w przypadku błędu
      setClothingItems([
        { id: 1, name: 'Kolczyki', cost: 50, icon: "💎", category: 'Biżuteria' },
        { id: 2, name: 'Kokardka', cost: 50, icon: "🎀", category: 'Dodatki' },
        { id: 3, name: 'Opaska w Panterke', cost: 70, icon: "🐆", category: 'Dodatki' },
        { id: 4, name: 'Kwiatek Hibiskus', cost: 70, icon: "🌺", category: 'Dodatki' },
        { id: 5, name: 'Tatuaże', cost: 100, icon: "🦋", category: 'Dekoracje' },
        { id: 6, name: 'Koszulka i❤️ Habi', cost: 150, icon: "👕", category: 'Ubrania' },
        { id: 7, name: 'Koszulka Banan', cost: 150, icon: "🍌", category: 'Ubrania' },
        { id: 8, name: 'Ogrodniczki', cost: 200, icon: "👗", category: 'Ubrania' },
        { id: 9, name: 'Tajemnicza opcja', cost: 300, icon: "❓", category: 'Specjalne' },
        { id: 10, name: 'Strój Playboy', cost: 500, icon: "🐰", category: 'Premium' }
      ]);
    }
  };

  // Pobieranie posiadanych ubrań użytkownika
  const fetchOwnedClothing = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('⚠️ Brak tokenu - użytkownik niezalogowany');
        // Sprawdź localStorage jako fallback
        const savedOwned = localStorage.getItem('ownedClothes');
        if (savedOwned) {
          setOwnedClothes(JSON.parse(savedOwned));
          console.log('📦 Wczytano posiadane ubrania z localStorage');
        }
        return;
      }

      console.log('🔄 Rozpoczynam pobieranie posiadanych ubrań...');
      const response = await fetch(`${API_BASE_URL}/api/clothing/owned`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Response status (owned):', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Pobrano posiadane ubrania:', data);
      setOwnedClothes(data.owned_clothing_ids || []);

      // Zapisz również do localStorage jako backup
      localStorage.setItem('ownedClothes', JSON.stringify(data.owned_clothing_ids || []));

    } catch (error) {
      console.error('❌ Błąd fetchOwnedClothing:', error);
      // Użyj localStorage jako fallback
      const savedOwned = localStorage.getItem('ownedClothes');
      if (savedOwned) {
        setOwnedClothes(JSON.parse(savedOwned));
        console.log('📦 Wczytano posiadane ubrania z localStorage (fallback)');
      }
    }
  };

  // Funkcja obsługująca zakup ubranka
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
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Brak tokenu autoryzacji');
      }

      console.log(`🔄 Wysyłam żądanie zakupu do API...`);
      const response = await fetch(`${API_BASE_URL}/api/clothing/purchase/${item.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status (purchase):', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błąd podczas zakupu');
      }

      const data = await response.json();
      console.log(`✅ Zakup udany!`, data);

      // Aktualizacja lokalnego stanu monet
      const newCoins = data.remaining_coins;
      setCurrentCoins(newCoins);
      if (onCoinsUpdate) {
        onCoinsUpdate(newCoins);
      }

      // Dodanie przedmiotu do posiadanych
      const updatedOwned = [...ownedClothes, item.id];
      setOwnedClothes(updatedOwned);

      // Zapisz do localStorage jako backup
      localStorage.setItem('ownedClothes', JSON.stringify(updatedOwned));

      // Wysłanie globalnego eventu o zmianie liczby monet
      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: newCoins }
      }));

      // Wyświetlenie animacji potwierdzającej zakup
      setPurchaseAnimation({
        itemName: data.item_name,
        icon: data.item_icon,
        cost: data.cost
      });

      // Ukrycie animacji po 3 sekundach
      setTimeout(() => setPurchaseAnimation(null), 3000);

    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      const errorMsg = error.message || 'Błąd podczas zakupu';
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

  // Wczytanie danych przy montowaniu komponentu
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 Inicjalizacja DressHabi...');
      setFetchingData(true);
      setLoading(true);

      await fetchClothingItems();
      await fetchOwnedClothing();

      setFetchingData(false);
      setLoading(false);
      console.log('✅ Inicjalizacja zakończona');
    };

    loadData();
  }, []);

  // Wyświetlenie wskaźnika ładowania podczas pobierania danych
  if (fetchingData) {
    return (
      <div className="dress-habi">
        <div className="dress-habi-container">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            gap: '20px'
          }}>
            <div style={{ fontSize: '48px' }}>🔄</div>
            <div style={{ fontSize: '18px', color: '#666' }}>
              Ładowanie garderoby...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dress-habi">
      <div className="dress-habi-container">
        {/* Nagłówek z przyciskiem powrotu i logo */}
        <div className="dress-header">
          <div className="dress-header-left">
            <button className="dress-back-btn" onClick={onBack} disabled={loading}>
              ←
            </button>
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

        {/* Komunikat jeśli nie ma ubrań */}
        {clothingItems.length === 0 && !fetchingData && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: '#fff3cd',
            borderRadius: '8px',
            margin: '10px 0',
            color: '#856404'
          }}>
            ⚠️ Brak dostępnych ubrań. Spróbuj odświeżyć stronę.
          </div>
        )}

        {/* Slider z dostępnymi ubraniami */}
        <div className="clothing-slider-container">
          <div className="clothing-items-slider">
            {clothingItems.map(item => {
              const canAfford = currentCoins >= item.cost && !loading;
              const isOwned = ownedClothes.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`clothing-item ${!canAfford && !isOwned ? 'disabled' : ''} ${loading ? 'loading' : ''} ${isOwned ? 'owned' : ''}`}
                  onClick={() => !isOwned && canAfford && handlePurchase(item)}
                  style={{ cursor: (!isOwned && canAfford) ? 'pointer' : 'not-allowed' }}
                >
                  <div className="clothing-item-image">
                    <span className="clothing-emoji">{item.icon}</span>
                  </div>
                  <div className="clothing-item-info">
                    <div className="clothing-item-name">{item.name}</div>
                    <div className="clothing-item-price">
                      <span className="coin-icon">🪙</span>
                      <span className="price-value">{item.cost}</span>
                    </div>
                  </div>

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
                style={{ width: `${clothingItems.length > 0 ? (ownedClothes.length / clothingItems.length) * 100 : 0}%` }}
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
          {ownedClothes.length === clothingItems.length && clothingItems.length > 0 && (
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