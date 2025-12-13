import React, { useState, useEffect } from 'react';
import './SlotMachine.css';

const SlotMachine = ({ isOpen, onClose, onWinCoins, userCoins, userId, username }) => {
  const [reels, setReels] = useState([
    ['🍌', '🍎', '🍇'],
    ['🍎', '🍇', '🍊'],
    ['🍇', '🍊', '🍓']
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wonCoins, setWonCoins] = useState(0);
  const [canPlay, setCanPlay] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  // Użyj username jako klucza (unikalny per użytkownik)
  const getStorageKey = () => {
    const identifier = username || `user_${userId}`;
    return `slotMachineLastPlay_${identifier}`;
  };

  // Wyczyść stare klucze tylko raz
  useEffect(() => {
    const cleanupKey = 'slotMachine_migrated_v2';
    const alreadyMigrated = localStorage.getItem(cleanupKey);

    if (!alreadyMigrated) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.match(/^slotMachineLastPlay_user_\d+$/)) {
          localStorage.removeItem(key);
        }
      }
      localStorage.setItem(cleanupKey, 'true');
    }
  }, []);

  useEffect(() => {
    if (isOpen && (username || userId)) {
      setShowResult(false);
      checkDailyLimit();
    }
  }, [isOpen, userId, username]);

  useEffect(() => {
    if (username || userId) {
      const interval = setInterval(checkDailyLimit, 60000);
      return () => clearInterval(interval);
    }
  }, [userId, username]);

  const checkDailyLimit = () => {
    if (!username && !userId) {
      setCanPlay(true);
      return;
    }

    const storageKey = getStorageKey();
    const lastPlayDate = localStorage.getItem(storageKey);
    const today = new Date().toDateString();

    if (lastPlayDate === today) {
      setCanPlay(false);
      calculateTimeUntilReset();
    } else {
      setCanPlay(true);
      setTimeUntilReset('');
    }
  };

  const calculateTimeUntilReset = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    setTimeUntilReset(`${hours}h ${minutes}m`);
  };

  const getRandomReel = () => {
    const reel = [];
    for (let i = 0; i < 3; i++) {
      reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    return reel;
  };

  const spinReels = () => {
    if (isSpinning || !canPlay) return;

    setIsSpinning(true);
    setShowResult(false);

    let count = 0;
    const interval = setInterval(() => {
      setReels([getRandomReel(), getRandomReel(), getRandomReel()]);
      count++;

      if (count >= 15) {
        clearInterval(interval);
        setTimeout(() => {
          determineResult();
        }, 300);
      }
    }, 100);
  };

  const determineResult = () => {
    const random = Math.random();
    let finalReels;

    if (random < 0.10) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      finalReels = [
        [symbol, symbol, symbol],
        [symbol, symbol, symbol],
        [symbol, symbol, symbol]
      ];
    } else if (random < 0.40) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const other1 = symbols.find(s => s !== symbol);
      const other2 = symbols.find(s => s !== symbol && s !== other1);

      finalReels = [
        [other1, symbol, other2],
        [other2, symbol, other1],
        [other1, other2, symbol]
      ];
    } else {
      const shuffled1 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled2 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled3 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);

      finalReels = [shuffled1, shuffled2, shuffled3];
    }

    setReels(finalReels);
    setIsSpinning(false);

    setTimeout(() => {
      const centerRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
      const coins = calculateWinnings(centerRow);

      setWonCoins(coins);
      setShowResult(true);

      const storageKey = getStorageKey();
      const today = new Date().toDateString();
      localStorage.setItem(storageKey, today);
      setCanPlay(false);

      if (onWinCoins) {
        onWinCoins(coins);
      }

      calculateTimeUntilReset();
    }, 1000);
  };

  const calculateWinnings = (centerRow) => {
    const [r1, r2, r3] = centerRow;

    if (r1 === r2 && r2 === r3) {
      return 30;
    }
    if (r1 === r2 || r2 === r3 || r1 === r3) {
      return 15;
    }
    return 5;
  };

  const handleClose = () => {
    if (!isSpinning && !showResult) {
      setShowResult(false);
      onClose();
    }
  };

  const handleResultClose = () => {
    setShowResult(false);
  };

  const handleFinalClose = () => {
    setShowResult(false);
    onClose();
  };

  if (!isOpen) return null;

  const centerRow = [reels[0][1], reels[1][1], reels[2][1]];

  return (
    <div className="slot-machine-overlay" onClick={handleClose}>
      <div className="slot-machine-popup" onClick={(e) => e.stopPropagation()}>
        <button
          className="slot-close-btn"
          onClick={handleClose}
          disabled={isSpinning}
          aria-label="Zamknij automat"
        >
          ✕
        </button>

        <div className="slot-header">
          <h2>🎰 automat 🎰</h2>
          <p className="slot-subtitle">Zagraj i wygraj monety!</p>
        </div>

        <div className="slot-machine-box">
          <div className="slot-machine-screen">
            <div className="win-line"></div>

            <div className="slot-reels-container">
              {reels.map((reel, reelIndex) => (
                <div key={reelIndex} className={`slot-reel-column ${isSpinning ? 'spinning' : ''}`}>
                  {reel.map((symbol, symbolIndex) => (
                    <div
                      key={symbolIndex}
                      className={`reel-symbol ${symbolIndex === 1 ? 'center' : ''}`}
                    >
                      {symbol}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="center-display">
            <div className="center-symbols">
              {centerRow.map((symbol, idx) => (
                <span key={idx} className="center-symbol">{symbol}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="slot-controls">
          {canPlay ? (
            <button
              className="slot-spin-button"
              onClick={spinReels}
              disabled={isSpinning}
            >
              {isSpinning ? '⏳ KRĘCĘ...' : '🎰 ZAGRAJ!'}
            </button>
          ) : (
            <div className="slot-locked">
              <div className="locked-icon">🔒</div>
              <p className="locked-text">Już dzisiaj zagrałeś!</p>
              <p className="locked-time">Następna gra za: {timeUntilReset}</p>
            </div>
          )}

          <div className="slot-coins-display">
            <span className="coins-label">Twoje monety:</span>
            <span className="coins-amount">🪙 {userCoins}</span>
          </div>
        </div>

        {showResult && (
          <div className="slot-result-popup" onClick={(e) => e.stopPropagation()}>
            <div className="slot-result-content">
              <div className="result-icon">
                {wonCoins === 30 ? '🎉' : wonCoins === 15 ? '🎊' : '👍'}
              </div>
              <h3 className="result-title">
                {wonCoins === 30 ? 'JACKPOT! MEGA BIG WIN!' : wonCoins === 15 ? 'Świetnie!' : 'Nieźle!'}
              </h3>
              <p className="result-text">Wygrałeś</p>
              <div className="result-coins">
                <span className="result-coins-value">{wonCoins}</span>
                <span className="result-coins-text">🪙 monet!</span>
              </div>
              <div className="result-buttons">
                <button className="result-view-btn" onClick={handleResultClose}>
                  👀 Zobacz automat
                </button>
                <button className="result-close-btn" onClick={handleFinalClose}>
                  ✅ Zamknij
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="slot-info">
          <p className="info-text">
            <span className="info-emoji">🎯</span>
            <span>3 takie same: 30🪙 • 2 takie same: 15🪙 • Inne: 5🪙</span>
          </p>
          <p className="info-text">
            <span className="info-emoji">⏰</span>
            <span>Grasz raz dziennie!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;