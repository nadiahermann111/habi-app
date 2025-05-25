import { useState, useEffect } from 'react';
import { authAPI, tokenUtils } from "C:\\Users\\nadula\\Pulpit\\habi-app\\frontend\\src\\services\\api.jsx";
import './MenuHeader.css';
import habiLogo from './habi-logo.png';

const MenuHeader = ({ onLogout, initialCoins = 0, onCoinsUpdate }) => {
  const [coins, setCoins] = useState(initialCoins);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCoins();

    // Automatyczne odświeżanie co 30 sekund
    const interval = setInterval(() => {
      fetchCoins();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchCoins = async () => {
    setLoading(true);
    try {
      const coinsData = await authAPI.getCoins();
      setCoins(coinsData.coins);
      // Wywołaj callback jeśli został przekazany
      if (onCoinsUpdate) {
        onCoinsUpdate(coinsData.coins);
      }
    } catch (error) {
      console.error('Błąd pobierania monet:', error);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja do manualnego odświeżania (można wywołać z zewnątrz)
  useEffect(() => {
    // Nasłuchuj na customowe eventy do odświeżania monet
    const handleCoinsUpdate = () => {
      fetchCoins();
    };

    window.addEventListener('coinsUpdated', handleCoinsUpdate);

    return () => {
      window.removeEventListener('coinsUpdated', handleCoinsUpdate);
    };
  }, []);

  const handleLogout = () => {
    if (window.confirm('Czy na pewno chcesz się wylogować?')) {
      onLogout();
    }
  };

  return (
    <header className="menu-header">
      <div className="menu-header-content">
        {/* Wylogowanie */}
        <button
          className="logout-btn"
          onClick={handleLogout}
          title="Wyloguj się"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16,17 21,12 16,7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>

        {/* Logo */}
        <div className="logo-container">
          <img
            src={habiLogo}
            alt="Habi Logo"
            className="habi-logo"
            onError={(e) => {
              // Fallback jeśli obrazek nie istnieje
              console.error('Nie można załadować logo');
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-fallback" style={{ display: 'none' }}>
            🐵 <span>Habi</span>
          </div>
        </div>

        {/* Monety */}
        <div className="coins-container">
          <div className="coins-display">
            <span className="coin-icon">🪙</span>
            <span className="coins-amount">
              {loading ? '...' : coins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MenuHeader;