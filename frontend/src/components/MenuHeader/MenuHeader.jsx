// components/MenuHeader/MenuHeader.jsx
import React from 'react';
import CoinSlot from '../CoinSlot/CoinSlot';
import './MenuHeader.css';
import habiLogo from './habi-logo.png';

const MenuHeader = ({ onLogout, initialCoins = 0, onCoinsUpdate }) => {

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
              console.error('Nie można załadować logo');
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="logo-fallback" style={{ display: 'none' }}>
            🐵 <span>Habi</span>
          </div>
        </div>

        {/* Monety - używamy CoinSlot */}
        <div className="coins-container">
          <CoinSlot
            initialCoins={initialCoins}
            onCoinsUpdate={onCoinsUpdate}
            size="medium"
            showRefreshButton={true}
            autoRefresh={true}
            refreshInterval={30000}
            animated={true}
          />
        </div>
      </div>
    </header>
  );
};

export default MenuHeader;