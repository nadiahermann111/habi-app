import React, { useState, useEffect } from 'react';
import { tokenUtils } from '../../services/api.jsx';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png';

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
  const [error, setError] = useState(null);
  const [ownedClothes, setOwnedClothes] = useState([]);
  const [clothingItems, setClothingItems] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);
  const [processingItemId, setProcessingItemId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const API_BASE_URL = 'https://habi-backend.onrender.com';

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

  const clothingSounds = {
    1: KolczykiSound,
    2: KokardaSound,
    3: OpaskaSound,
    4: KwiatekSound,
    5: TatuazeSound,
    6: HabiSound,
    7: BananySound,
    8: OgrodnickiSound,
    9: ShrekSound,
    10: PlayboySound
  };

  // ============================================
  // Helper funkcje dla user-specific localStorage
  // ============================================

  /**
   * Pobiera ID aktualnie zalogowanego użytkownika
   */
  const getUserId = () => {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id;
      }
    } catch (error) {
      console.error('Błąd pobierania user ID:', error);
    }
    return null;
  };

  /**
   * Czyści dane użytkownika z localStorage (przy wylogowaniu/zmianie użytkownika)
   */
  const clearUserClothingData = (userId) => {
    if (userId) {
      localStorage.removeItem(`ownedClothes_${userId}`);
      localStorage.removeItem(`currentClothing_${userId}`);
      console.log(`🗑️ Wyczyszczono dane ubrań dla użytkownika ${userId}`);
    }

    // Usuń też stare klucze bez userId (legacy)
    localStorage.removeItem('ownedClothes');
    localStorage.removeItem('currentClothing');
  };

  /**
   * Zapisuje posiadane ubrania do localStorage dla konkretnego użytkownika
   */
  const saveOwnedClothesToStorage = (userId, clothes) => {
    if (userId) {
      localStorage.setItem(`ownedClothes_${userId}`, JSON.stringify(clothes));
      console.log(`💾 Zapisano ubrania dla użytkownika ${userId}:`, clothes);
    }
  };

  /**
   * Pobiera posiadane ubrania z localStorage dla konkretnego użytkownika
   */
  const getOwnedClothesFromStorage = (userId) => {
    if (!userId) return [];

    try {
      const stored = localStorage.getItem(`ownedClothes_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Błąd odczytu ownedClothes:', error);
      return [];
    }
  };

  /**
   * Zapisuje aktualnie noszone ubranie do localStorage dla konkretnego użytkownika
   */
  const saveCurrentClothingToStorage = (userId, clothingId) => {
    if (userId) {
      if (clothingId === null || clothingId === undefined) {
        localStorage.removeItem(`currentClothing_${userId}`);
        console.log(`🗑️ Usunięto currentClothing dla użytkownika ${userId}`);
      } else {
        localStorage.setItem(`currentClothing_${userId}`, JSON.stringify(clothingId));
        console.log(`💾 Zapisano currentClothing dla użytkownika ${userId}:`, clothingId);
      }
    }
  };

  /**
   * Pobiera aktualnie noszone ubranie z localStorage dla konkretnego użytkownika
   */
  const getCurrentClothingFromStorage = (userId) => {
    if (!userId) return null;

    try {
      const stored = localStorage.getItem(`currentClothing_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Błąd odczytu currentClothing:', error);
      return null;
    }
  };

  // ============================================
  // Funkcje audio
  // ============================================

  const playSound = (itemId) => {
    try {
      const soundFile = clothingSounds[itemId];
      if (soundFile) {
        const audio = new Audio(soundFile);
        audio.volume = 0.6;
        audio.play().catch(err => console.log('🔇 Nie udało się odtworzyć dźwięku:', err));
      } else {
        console.log('🔇 Brak dźwięku dla przedmiotu ID:', itemId);
      }
    } catch (error) {
      console.log('🔇 Błąd odtwarzania:', error);
    }
  };

  // ============================================
  // Funkcje wyświetlania
  // ============================================

  const getHabiImage = () => {
    if (!currentClothing) return HabiAdultHappy;
    return clothingImages[currentClothing] || HabiAdultHappy;
  };

  // ============================================
  // Funkcje API
  // ============================================

  /**
   * Pobiera listę wszystkich dostępnych ubrań z API
   */
  const fetchClothingItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clothing`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        setClothingItems(data);
        console.log('✅ Pobrano listę ubrań:', data.length);
      } else {
        // Fallback do hardcoded listy
        const fallbackItems = [
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
        ];
        setClothingItems(fallbackItems);
        console.log('⚠️ Użyto fallback listy ubrań');
      }
    } catch (error) {
      console.error('❌ Błąd fetchClothingItems:', error);
      setError(`Nie udało się pobrać listy ubrań: ${error.message}`);
    }
  };

  /**
   * Pobiera posiadane ubrania i aktualnie noszone ubranie z backendu
   * BACKEND JEST ŹRÓDŁEM PRAWDY - localStorage używany tylko jako cache
   */
  const fetchOwnedClothing = async () => {
    const userId = getUserId();

    if (!userId) {
      console.log('⚠️ Brak userId - użytkownik niezalogowany');
      setOwnedClothes([]);
      if (onClothingChange) onClothingChange(null);
      return;
    }

    const token = tokenUtils.getToken();
    if (!token) {
      console.log('⚠️ Brak tokenu - czyszczenie danych');
      clearUserClothingData(userId);
      setOwnedClothes([]);
      if (onClothingChange) onClothingChange(null);
      return;
    }

    try {
      console.log(`🔄 Pobieranie garderoby dla użytkownika ${userId}...`);

      const response = await fetch(`${API_BASE_URL}/api/clothing/owned`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Obsługa błędu 401 (wygasła sesja)
      if (response.status === 401) {
        console.error('❌ Sesja wygasła - przekierowanie do logowania');
        tokenUtils.removeToken();
        clearUserClothingData(userId);
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Response z backendu:', data);

      // ✅ BACKEND JEST ŹRÓDŁEM PRAWDY
      const backendOwnedClothes = data.owned_clothing_ids || [];
      const backendCurrentClothing = data.current_clothing_id;

      console.log(`  - Posiadane ubrania:`, backendOwnedClothes);
      console.log(`  - Aktualnie noszone:`, backendCurrentClothing);

      // Zapisz do state i localStorage (jako cache)
      setOwnedClothes(backendOwnedClothes);
      saveOwnedClothesToStorage(userId, backendOwnedClothes);

      // Synchronizuj aktualnie noszone ubranie
      if (backendCurrentClothing === null || backendCurrentClothing === undefined) {
        console.log('👔 Backend: brak ubrania');
        saveCurrentClothingToStorage(userId, null);
        clothingStorage.save(null);
        if (onClothingChange) onClothingChange(null);
      } else {
        // Sprawdź czy użytkownik faktycznie posiada to ubranie
        if (backendOwnedClothes.includes(backendCurrentClothing)) {
          console.log(`👔 Backend: założono ID ${backendCurrentClothing}`);
          saveCurrentClothingToStorage(userId, backendCurrentClothing);
          clothingStorage.save(backendCurrentClothing);
          if (onClothingChange) onClothingChange(backendCurrentClothing);
        } else {
          console.warn('⚠️ Backend zwraca ubranie którego użytkownik nie posiada!');
          saveCurrentClothingToStorage(userId, null);
          clothingStorage.save(null);
          if (onClothingChange) onClothingChange(null);
        }
      }

    } catch (error) {
      console.error('❌ Błąd fetchOwnedClothing:', error);

      // W przypadku błędu sieciowego, użyj cache jeśli dostępny
      const cachedOwned = getOwnedClothesFromStorage(userId);
      const cachedCurrent = getCurrentClothingFromStorage(userId);

      if (cachedOwned.length > 0) {
        console.log('📱 Używam cache - tryb offline');
        setOwnedClothes(cachedOwned);

        if (cachedCurrent && cachedOwned.includes(cachedCurrent)) {
          clothingStorage.save(cachedCurrent);
          if (onClothingChange) onClothingChange(cachedCurrent);
        }

        setError('Tryb offline - używam zapisanych danych');
      } else {
        clearUserClothingData(userId);
        setOwnedClothes([]);
        if (onClothingChange) onClothingChange(null);
      }
    }
  };

  /**
   * Aktualizuje aktualnie noszone ubranie na backendzie i lokalnie
   */
  const updateCurrentClothing = async (clothingId) => {
    const userId = getUserId();
    const token = tokenUtils.getToken();

    if (!token || !userId) {
      console.warn('⚠️ Brak tokenu lub userId - zapis tylko lokalny');
      saveCurrentClothingToStorage(userId, clothingId);
      clothingStorage.save(clothingId);
      if (onClothingChange) onClothingChange(clothingId);
      return;
    }

    try {
      console.log(`📤 Zmiana ubrania na: ${clothingId} (user: ${userId})`);

      const response = await fetch(`${API_BASE_URL}/api/clothing/wear/${clothingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('❌ Sesja wygasła');
        tokenUtils.removeToken();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Błąd: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Ubranie zaktualizowane:', data);

      // Aktualizuj lokalnie TYLKO po potwierdzeniu z backendu
      saveCurrentClothingToStorage(userId, clothingId);
      clothingStorage.save(clothingId);
      if (onClothingChange) {
        console.log(`✅ onClothingChange(${clothingId})`);
        onClothingChange(clothingId);
      }

    } catch (error) {
      console.error('❌ Błąd updateCurrentClothing:', error);
      setError(`Nie udało się zmienić ubrania: ${error.message}`);

      // Odśwież dane z backendu w przypadku błędu
      await fetchOwnedClothing();
    }
  };

  /**
   * Obsługuje zakup ubrania
   */
  const handlePurchase = async (item) => {
    if (processingItemId) {
      console.log('⏳ Transakcja w toku...');
      return;
    }

    const userId = getUserId();
    console.log(`🛒 Zakup ${item.name} za ${item.cost} monet (user: ${userId})`);
    setError(null);

    // Walidacje
    if (ownedClothes.includes(item.id)) {
      setError(`Już posiadasz ${item.name}!`);
      return;
    }

    if (currentCoins < item.cost) {
      setError(`Potrzebujesz ${item.cost} monet, masz ${currentCoins}!`);
      return;
    }

    setProcessingItemId(item.id);

    try {
      const token = tokenUtils.getToken();
      if (!token) throw new Error('Brak tokenu autoryzacji');

      console.log(`🔄 API: zakup przedmiotu ${item.id}...`);

      const response = await fetch(`${API_BASE_URL}/api/clothing/purchase/${item.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        console.error('❌ Sesja wygasła');
        tokenUtils.removeToken();
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błąd podczas zakupu');
      }

      const data = await response.json();
      console.log(`✅ Zakup udany!`, data);

      // Odtwórz dźwięk
      playSound(item.id);

      // Aktualizuj monety
      const newCoins = data.remaining_coins;
      setCurrentCoins(newCoins);
      if (onCoinsUpdate) onCoinsUpdate(newCoins);

      // Aktualizuj posiadane ubrania
      const updatedOwned = [...ownedClothes, item.id];
      setOwnedClothes(updatedOwned);
      saveOwnedClothesToStorage(userId, updatedOwned);

      // Automatycznie załóż kupione ubranie
      console.log(`👗 Automatyczne założenie ${item.name} (ID: ${item.id})`);
      await updateCurrentClothing(item.id);

      // Wyślij event o zmianie monet
      window.dispatchEvent(new CustomEvent('coinsUpdated', {
        detail: { coins: newCoins }
      }));

      // Pokaż animację zakupu
      setPurchaseAnimation({
        itemName: data.item_name,
        icon: data.item_icon,
        cost: data.cost
      });

      setTimeout(() => setPurchaseAnimation(null), 1500);

    } catch (error) {
      console.error('❌ Błąd handlePurchase:', error);
      setError(error.message || 'Błąd podczas zakupu');
    } finally {
      setProcessingItemId(null);
    }
  };

  /**
   * Obsługuje ręczną zmianę ubrania (kliknięcie na posiadane)
   */
  const handleClothingSelect = async (item) => {
    if (ownedClothes.includes(item.id) && currentClothing !== item.id) {
      console.log(`👗 Zmiana na ${item.name} (ID: ${item.id})`);

      // Odtwórz dźwięk
      playSound(item.id);

      // Zapisz na backendzie i lokalnie
      await updateCurrentClothing(item.id);
    }
  };

  /**
   * Callback aktualizacji monet z CoinSlot
   */
  const handleCoinsUpdate = (newCoins) => {
    setCurrentCoins(newCoins);
    if (onCoinsUpdate) onCoinsUpdate(newCoins);
  };

  // ============================================
  // useEffect hooks
  // ============================================

  // Synchronizuj monety z propsów
  useEffect(() => {
    setCurrentCoins(userCoins);
  }, [userCoins]);

  // Pobierz userId przy montowaniu i sprawdź czy się zmienił
  useEffect(() => {
    const userId = getUserId();

    if (userId !== currentUserId) {
      console.log(`👤 Zmiana użytkownika: ${currentUserId} → ${userId}`);

      // Wyczyść dane starego użytkownika
      if (currentUserId) {
        clearUserClothingData(currentUserId);
      }

      setCurrentUserId(userId);
      setOwnedClothes([]);
      if (onClothingChange) onClothingChange(null);
    }
  }, []);

  // Załaduj dane przy montowaniu komponentu
  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);

      await fetchClothingItems();
      await fetchOwnedClothing();

      setFetchingData(false);
    };

    loadData();
  }, []);

  // ============================================
  // Renderowanie - Loading state
  // ============================================

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

  // ============================================
  // Renderowanie - Główny widok
  // ============================================

  return (
    <div className="dress-habi">
      <div className="dress-habi-container">
        {/* Header */}
        <div className="dress-header">
          <div className="dress-header-left">
            <button
              className="dress-back-btn"
              onClick={onBack}
              disabled={processingItemId}
            >
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

        {/* Komunikat błędu */}
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

        {/* Animacja zakupu */}
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

        {/* Lista ubrań do kupienia */}
        <div className="clothing-slider-container">
          <div className="clothing-items-slider">
            {clothingItems.map(item => {
              const isProcessing = processingItemId === item.id;
              const canAfford = currentCoins >= item.cost;
              const isOwned = ownedClothes.includes(item.id);
              const isWearing = currentClothing === item.id;
              const isDisabled = !canAfford && !isOwned;

              return (
                <div
                  key={item.id}
                  className={`clothing-item ${isDisabled ? 'disabled' : ''} ${isOwned ? 'owned' : ''} ${isWearing ? 'wearing' : ''}`}
                  onClick={() => {
                    if (isProcessing || processingItemId) return;
                    if (!isOwned && canAfford) {
                      handlePurchase(item);
                    }
                  }}
                  style={{
                    cursor: (isProcessing || processingItemId) ? 'not-allowed' :
                            (!isOwned && canAfford) ? 'pointer' :
                            (isOwned && !isWearing) ? 'pointer' :
                            'default',
                    opacity: isProcessing ? 0.6 : 1,
                    pointerEvents: (isProcessing || processingItemId || isWearing) ? 'none' : 'auto'
                  }}
                >
                  {/* Cena */}
                  <div className="clothing-item-price">
                    <span className="coin-icon">🪙</span>
                    <span className="price-value">{item.cost}</span>
                  </div>

                  {/* Obrazek */}
                  <div className="clothing-item-image">
                    <span className="clothing-emoji">{item.icon}</span>
                  </div>

                  {/* Nazwa */}
                  <div className="clothing-item-name">{item.name}</div>

                  {/* Overlay - Brak monet */}
                  {isDisabled && !isProcessing && (
                    <div className="clothing-item-overlay">
                      <span>Brak monet</span>
                    </div>
                  )}

                  {/* Overlay - Posiadane */}
                  {isOwned && !isWearing && (
                    <div
                      className="clothing-item-overlay owned-overlay"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!processingItemId) {
                          handleClothingSelect(item);
                        }
                      }}
                    >
                      <span>✅ Posiadane<br/>Kliknij aby założyć</span>
                    </div>
                  )}

                  {/* Overlay - Założone */}
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

        {/* Podgląd Habi z aktualnym ubraniem */}
        <div className="habi-character-section">
          <div className="habi-avatar-large">
            <img src={getHabiImage()} alt="Habi" className="habi-image" />
          </div>

          {/* Informacje o garderobie */}
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
                style={{
                  width: `${clothingItems.length > 0 ? (ownedClothes.length / clothingItems.length) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Wskazówki */}
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