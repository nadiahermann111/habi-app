import React, { useState, useEffect } from 'react';
import CoinSlot from '../CoinSlot/CoinSlot';
import HabiLogo from './habi-logo.png';
import { getClothingImage, clothingStorage } from '../../utils/clothingHelper';
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

  // Wczytaj obrazek Habi
  const habiImagePath = require(`../HabiClothes/${getClothingImage(currentClothing)}`);

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
      if (!token) {
        const savedOwned = localStorage.getItem('ownedClothes');
        if (savedOwned) setOwnedClothes(JSON.parse(savedOwned));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/clothing/owned`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setOwnedClothes(data.owned_clothing_ids || []);
      localStorage.setItem('ownedClothes', JSON.stringify(data.owned_clothing_ids || []));
    } catch (error) {
      console.error('❌ Błąd fetchOwnedClothing:', error);
      const savedOwned = localStorage.getItem('ownedClothes');
      if (savedOwned) setOwnedClothes(JSON.parse(savedOwned));
    }
  };

  const handlePurchase = async (item) => {
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

      const response = await fetch(`${API_BASE_URL}/api/clothing/purchase/${item.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Błąd podczas zakupu');
      }

      const data = await response.json();
      const newCoins = data.remaining_coins;

      setCurrentCoins(newCoins);
      if (onCoinsUpdate) onCoinsUpdate(newCoins);

      const updatedOwned = [...ownedClothes, item.id];
      setOwnedClothes(updatedOwned);
      localStorage.setItem('ownedClothes', JSON.stringify(updatedOwned));

      // 🎉 ZMIANA UBRANIA PO ZAKUPIE
      clothingStorage.save(item.id);
      if (onClothingChange) onClothingChange(item.id);

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

  // Funkcja ręcznej zmiany ubrania
  const handleClothingSelect = (item) => {
    if (ownedClothes.includes(item.id)) {
      clothingStorage.save(item.id);
      if (onClothingChange) onClothingChange(item.id);
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
            <img src={habiImagePath} alt="Habi" className="habi-image" />
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DressHabi;