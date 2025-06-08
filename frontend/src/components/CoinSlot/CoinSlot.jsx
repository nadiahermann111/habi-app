// components/CoinSlot/CoinSlot.jsx
import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api.jsx';
import './CoinSlot.css';

const CoinSlot = ({
  initialCoins = 0,
  onCoinsUpdate,
  autoRefresh = true,
  refreshInterval = 30000, // 30 sekund
  animated = true
}) => {
  const [coins, setCoins] = useState(initialCoins);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Funkcja do pobierania monet z API
  const fetchCoins = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const coinsData = await authAPI.getCoins();
      const newCoins = coinsData.coins;

      // Animacja tylko jeśli monety się zmieniły
      if (animated && newCoins !== coins) {
        setCoins(newCoins);
        // Dodaj animację "bounce" gdy monety się zwiększają
        if (newCoins > coins) {
          const coinElement = document.querySelector('.coin-slot');
          coinElement?.classList.add('coins-increased');
          setTimeout(() => {
            coinElement?.classList.remove('coins-increased');
          }, 600);
        }
      } else {
        setCoins(newCoins);
      }

      // Wywołaj callback
      if (onCoinsUpdate) {
        onCoinsUpdate(newCoins);
      }

      return newCoins;
    } catch (error) {
      console.error('Błąd pobierania monet:', error);
      setError('Błąd połączenia');

      // Spróbuj użyć cache z localStorage
      const cachedCoins = localStorage.getItem('cached_coins');
      if (cachedCoins) {
        setCoins(parseInt(cachedCoins));
      }

      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCoins(false); // Nie pokazuj loading przy auto-refresh
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Nasłuchuj na globalne eventy aktualizacji monet
  useEffect(() => {
    const handleCoinsUpdate = (event) => {
      if (event.detail && typeof event.detail.coins === 'number') {
        setCoins(event.detail.coins);
        if (onCoinsUpdate) {
          onCoinsUpdate(event.detail.coins);
        }
      } else {
        fetchCoins(false);
      }
    };

    const handleForceRefresh = () => {
      fetchCoins(true);
    };

    window.addEventListener('coinsUpdated', handleCoinsUpdate);
    window.addEventListener('forceCoinsRefresh', handleForceRefresh);

    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate);
      window.removeEventListener('forceCoinsRefresh', handleForceRefresh);
    };
  }, [onCoinsUpdate]);

  // Synchronizuj z initialCoins
  useEffect(() => {
    if (initialCoins !== coins && initialCoins > 0) {
      setCoins(initialCoins);
    }
  }, [initialCoins]);

  // Cache monet w localStorage
  useEffect(() => {
    if (coins > 0) {
      localStorage.setItem('cached_coins', coins.toString());
    }
  }, [coins]);

  // Pobierz monety przy pierwszym załadowaniu
  useEffect(() => {
    fetchCoins(true);
  }, []);

  const formatCoins = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  return (
    <div className="coin-slot">
      <div className="coin-slot-content">
        <span className="coin-icon">🪙</span>
        <span className="coins-amount">
          {formatCoins(coins)}
        </span>
      </div>
    </div>
  );
};

export default CoinSlot;