import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api.jsx';
import './CoinSlot.css';

const CoinSlot = ({
  initialCoins = 0,
  onCoinsUpdate,
  autoRefresh = true,
  refreshInterval = 30000,
  animated = true
}) => {
  // Stan przechowujący aktualną liczbę monet
  const [coins, setCoins] = useState(initialCoins);
  // Stan informujący o trwającym ładowaniu danych
  const [loading, setLoading] = useState(false);
  // Stan przechowujący informacje o błędach
  const [error, setError] = useState(null);

  // Funkcja pobierająca aktualną liczbę monet z serwera
  const fetchCoins = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      // Pobranie danych o monetach z API
      const coinsData = await authAPI.getCoins();
      const newCoins = coinsData.coins;

      // Sprawdzenie czy włączyć animację przy zmianie liczby monet
      if (animated && newCoins !== coins) {
        setCoins(newCoins);

        // Dodanie animacji "bounce" gdy liczba monet wzrasta
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

      // Wywołanie funkcji callback z nową liczbą monet
      if (onCoinsUpdate) {
        onCoinsUpdate(newCoins);
      }

      return newCoins;
    } catch (error) {
      console.error('Błąd pobierania monet:', error);
      setError('Błąd połączenia');

      // Użycie cached wartości z localStorage w przypadku błędu połączenia
      const cachedCoins = localStorage.getItem('cached_coins');
      if (cachedCoins) {
        setCoins(parseInt(cachedCoins));
      }

      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Automatyczne odświeżanie monet w określonych interwałach
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchCoins(false); // Odświeżanie w tle bez pokazywania loadingu
    }, refreshInterval);

    // Czyszczenie interwału przy odmontowaniu komponentu
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Nasłuchiwanie globalnych eventów dotyczących aktualizacji monet
  useEffect(() => {
    // Obsługa eventu aktualizacji monet z innych części aplikacji
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

    // Obsługa eventu wymuszającego odświeżenie monet
    const handleForceRefresh = () => {
      fetchCoins(true);
    };

    // Dodanie nasłuchiwaczy eventów
    window.addEventListener('coinsUpdated', handleCoinsUpdate);
    window.addEventListener('forceCoinsRefresh', handleForceRefresh);

    // Usunięcie nasłuchiwaczy przy odmontowaniu komponentu
    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate);
      window.removeEventListener('forceCoinsRefresh', handleForceRefresh);
    };
  }, [onCoinsUpdate]);

  // Synchronizacja z parametrem initialCoins przekazanym z rodzica
  useEffect(() => {
    if (initialCoins !== coins && initialCoins > 0) {
      setCoins(initialCoins);
    }
  }, [initialCoins]);

  // Zapisywanie aktualnej liczby monet w localStorage jako cache
  useEffect(() => {
    if (coins > 0) {
      localStorage.setItem('cached_coins', coins.toString());
    }
  }, [coins]);

  // Pobranie monet przy pierwszym załadowaniu komponentu
  useEffect(() => {
    fetchCoins(true);
  }, []);

  // Funkcja formatująca dużą liczbę monet do czytelnej formy (K, M)
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
        {}
        <span className="coin-icon">🪙</span>
        {}
        <span className="coins-amount">
          {formatCoins(coins)}
        </span>
      </div>
    </div>
  );
};

export default CoinSlot;