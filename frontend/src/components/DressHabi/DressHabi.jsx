import React, { useState, useEffect } from 'react';
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

// 🔊 IMPORTY DŹWIĘKÓW
import BananySound from '../Sounds/Banany.mp3';
import HabiSound from '../Sounds/Habi.mp3';
import KokardaSound from '../Sounds/Kokarda.mp3';
import KolczykiSound from '../Sounds/Kolczyki.mp3';
import KwiatekSound from '../Sounds/Kwiatek.mp3';
import OgrodnickiSound from '../Sounds/Ogrodniczki.mp3';
import OpaskaSound from '../Sounds/Opaska.mp3';
import PlayboySound from '../Sounds/Playboy.mp3';
import ShrekSound from '../Sounds/Shrek.mp3';
import TatuazeSound from '../Sounds/Tatuaze.mp3';

import { clothingStorage } from '../../utils/clothingHelper';
import './DressHabi.css';

const DressHabi = ({ onBack, userCoins, onCoinsUpdate, currentClothing, onClothingChange }) => {
  const [currentCoins, setCurrentCoins] = useState(userCoins);
  const [purchaseAnimation, setPurchaseAnimation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ownedClothes, setOwnedClothes] = useState([]);
  const [clothingItems, setClothingItems] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);

  const API_BASE_URL = 'https://habi-backend.onrender.com';

  // ✅ MAPA OBRAZKÓW - BEZ require()
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

  // 🔊 MAPA DŹWIĘKÓW - dopasowana do ID ubranek
  const clothingSounds = {
    1: KolczykiSound,     // Kolczyki
    2: KokardaSound,      // Kokardka
    3: OpaskaSound,       // Opaska w Panterke
    4: KwiatekSound,      // Kwiatek Hibiskus
    5: TatuazeSound,      // Tatuaże
    6: HabiSound,         // Koszulka i❤️ Habi
    7: BananySound,       // Koszulka Banan
    8: OgrodnickiSound,   // Ogrodniczki
    9: ShrekSound,        // Tajemnicza opcja (Shrek)
    10: PlayboySound      // Strój Playboy
  };

  // 🔊 FUNKCJA DO ODTWARZANIA DŹWIĘKÓW
  const playSound = (itemId) => {
    try {
      const soundFile = clothingSounds[itemId];
      if (soundFile) {
        const audio = new Audio(soundFile);
        audio.volume = 0.6; // głośność 60%
        audio.play().catch(err => console.log('🔇 Nie udało się odtworzyć dźwięku:', err));
      } else {
        console.log('🔇 Brak dźwięku dla przedmiotu ID:', itemId);
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

  const fetchClothingItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clothing`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        setClothingItems(data);
      } else {
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
    }
  };

  const fetchOwnedClothing = async () => {
    try {
      const token = localStorage.getItem('token');

      // 🧹 JEŚLI NIE MA TOKENU - WYCZYŚĆ WSZYSTKO
      if (!token) {
        console.log('⚠️ Brak tokenu - czyszczenie lokalnych danych');
        localStorage.removeItem('currentClothing');
        localStorage.removeItem('ownedClothes');
        setOwnedClothes([]);
        clothingStorage.save(null);
        if (onClothingChange) onClothingChange(null);
        return;
      }

      console.log('🔄 Pobieranie danych z backendu...');
      const response = await fetch(`${API_BASE_URL}/api/clothing/owned`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // 🔍 DEBUGOWANIE - pokaż co zwrócił backend
      console.log('📦 Response z backendu:', data);
      console.log('  - owned_clothing_ids:', data.owned_clothing_ids);
      console.log('  - current_clothing_id:', data.current_clothing_id);

      // ✅ Zapisz posiadane ubrania
      const owned = data.owned_clothing_ids || [];
      setOwnedClothes(owned);
      localStorage.setItem('ownedClothes', JSON.stringify(owned));

      // ✅ KRYTYCZNA CZĘŚĆ - synchronizacja aktualnie noszonego ubrania
      const backendClothingId = data.current_clothing_id;

      // Jeśli backend zwraca null lub undefined - wyczyść lokalne dane
      if (backendClothingId === null || backendClothingId === undefined) {
        console.log('👔 Backend zwraca NULL - czyszczę ubranie');
        localStorage.removeItem('currentClothing');
        clothingStorage.save(null);
        if (onClothingChange) {
          onClothingChange(null);
        }
      }
      // Jeśli backend zwraca konkretne ID - ustaw je
      else {
        console.log('👔 Backend zwraca ID:', backendClothingId);

        // Sprawdź czy użytkownik faktycznie posiada to ubranie
        if (owned.includes(backendClothingId)) {
          clothingStorage.save(backendClothingId);
          if (onClothingChange) {
            onClothingChange(backendClothingId);
          }
          console.log('✅ Ustawiono ubranie z backendu:', backendClothingId);
        } else {
          console.warn('⚠️ Backend zwraca ubranie którego użytkownik nie posiada! Czyszczę...');
          clothingStorage.save(null);
          if (onClothingChange) {
            onClothingChange(null);
          }
        }
      }

    } catch (error) {
      console.error('❌ Błąd fetchOwnedClothing:', error);

      // W przypadku błędu - wyczyść wszystko dla bezpieczeństwa
      localStorage.removeItem('currentClothing');
      setOwnedClothes([]);
      clothingStorage.save(null);
      if (onClothingChange) {
        onClothingChange(null);
      }
    }
  };

  // ✅ FUNKCJA: Aktualizacja aktualnie noszonego ubrania na backendzie
  const updateCurrentClothing = async (clothingId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('⚠️ Brak tokenu - nie można zapisać ubrania na backendzie');
        clothingStorage.save(clothingId);
        if (onClothingChange) onClothingChange(clothingId);
        return;
      }

      console.log('📤 Wysyłam żądanie zmiany ubrania na:', clothingId);

      const response = await fetch(`${API_BASE_URL}/api/clothing/wear/${clothingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Błąd przy zmianie ubrania: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Ubranie zaktualizowane na backendzie:', data);

      // Aktualizuj lokalnie tylko po potwierdzeniu z backendu
      clothingStorage.save(clothingId);
      if (onClothingChange) {
        console.log('✅ Wywołuję onClothingChange z ID:', clothingId);
        onClothingChange(clothingId);
      }

    } catch (error) {
      console.error('❌ Błąd updateCurrentClothing:', error);
      alert(`Nie udało się zmienić ubrania: ${error.message}`);

      // NIE zapisuj lokalnie jeśli backend odmówił
      // Odśwież dane z backendu
      await fetchOwnedClothing();
    }
  };

  const handlePurchase = async (item) => {
    console.log(`🛒 Próba zakupu ${item.name} za ${item.cost} monet`);
    setError(null);

    if (ownedClothes.includes(item.id)) {
      alert(`Już posiadasz ${item.name}!`);
      return;
    }

    if (currentCoins < item.cost) {
      alert(`Potrzebujesz ${item.cost} monet, ale masz tylko ${currentCoins}!`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Brak tokenu autoryzacji');

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

      // 🔊 ODTWÓRZ DŹWIĘK DLA ZAKUPIONEGO PRZEDMIOTU
      playSound(item.id);

      const newCoins = data.remaining_coins;
      setCurrentCoins(newCoins);
      if (onCoinsUpdate) onCoinsUpdate(newCoins);

      const updatedOwned = [...ownedClothes, item.id];
      setOwnedClothes(updatedOwned);
      localStorage.setItem('ownedClothes', JSON.stringify(updatedOwned));

      // 🎉 ZMIANA UBRANIA PO ZAKUPIE - wysłanie do backendu
      console.log('👗 Automatyczne założenie', item.name, 'ID:', item.id);
      await updateCurrentClothing(item.id);

      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: newCoins }
      }));

      setPurchaseAnimation({
        itemName: data.item_name,
        icon: data.item_icon,
        cost: data.cost
      });

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

  const handleClothingSelect = async (item) => {
    if (ownedClothes.includes(item.id)) {
      console.log(`👗 Ręczna zmiana na ${item.name} (ID: ${item.id})`);

      // 🔊 ODTWÓRZ DŹWIĘK PRZY ZMIANIE UBRANIA
      playSound(item.id);

      // ✅ Zapisz na backendzie i lokalnie
      await updateCurrentClothing(item.id);
    }
  };

  const handleCoinsUpdate = (newCoins) => {
    setCurrentCoins(newCoins);
    if (onCoinsUpdate) onCoinsUpdate(newCoins);
  };

  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      await fetchClothingItems();
      await fetchOwnedClothing();
      setFetchingData(false);
    };
    loadData();
  }, []);

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
        <div className="dress-header">
          <div className="dress-header-left">
            <button className="dress-back-btn" onClick={onBack} disabled={loading}>
              ←
            </button>
            <img src={HabiLogo} alt="Habi" className="habi-logo-m" />
          </div>
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
              <div className="purchase-subtitle">
                Dodano do garderoby i założono! 🎉
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

        <div className="clothing-slider-container">
          <div className="clothing-items-slider">
            {clothingItems.map(item => {
              const canAfford = currentCoins >= item.cost && !loading;
              const isOwned = ownedClothes.includes(item.id);
              const isWearing = currentClothing === item.id;

              return (
                <div
                  key={item.id}
                  className={`clothing-item ${!canAfford && !isOwned ? 'disabled' : ''} ${loading ? 'loading' : ''} ${isOwned ? 'owned' : ''} ${isWearing ? 'wearing' : ''}`}
                  onClick={() => !isOwned && canAfford && handlePurchase(item)}
                  style={{
                    cursor: (!isOwned && canAfford) ? 'pointer' : (isOwned ? 'pointer' : 'not-allowed'),
                    border: isWearing ? '3px solid #4CAF50' : undefined
                  }}
                >
                  <div className="clothing-item-price">
                    <span className="coin-icon">🪙</span>
                    <span className="price-value">{item.cost}</span>
                  </div>

                  <div className="clothing-item-image">
                    <span className="clothing-emoji">{item.icon}</span>
                  </div>

                  <div className="clothing-item-name">{item.name}</div>

                  {!canAfford && !isOwned && (
                    <div className="clothing-item-overlay">
                      <span>{loading ? 'Kupowanie...' : 'Brak monet'}</span>
                    </div>
                  )}

                  {isOwned && !isWearing && (
                    <div className="clothing-item-overlay owned-overlay" onClick={(e) => {
                      e.stopPropagation();
                      handleClothingSelect(item);
                    }}>
                      <span>✅ Posiadane<br/>Kliknij aby założyć</span>
                    </div>
                  )}

                  {isWearing && (
                    <div className="clothing-item-overlay wearing-overlay">
                      <span>👔 Założone</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={getHabiImage()} alt="Habi" className="habi-image" />
          </div>

          <div className="wardrobe-info">
            <h3>Twoja Garderoba</h3>
            <p>Posiadasz {ownedClothes.length} z {clothingItems.length} ubranek</p>
            {currentClothing && (
              <p style={{ marginTop: '10px', color: '#4CAF50', fontWeight: 'bold' }}>
                👔 Obecnie nosi: {clothingItems.find(item => item.id === currentClothing)?.name}
              </p>
            )}
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${clothingItems.length > 0 ? (ownedClothes.length / clothingItems.length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="dress-tips">
          <div className="tip-card">
            <span className="tip-icon">👗</span>
            <div className="tip-content">
              <strong>Wskazówka:</strong> Kliknij na ubranka aby kupić! Po zakupie automatycznie założą się na Habi.
              Możesz też kliknąć posiadane ubranka aby je założyć.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DressHabi;