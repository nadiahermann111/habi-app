import React, { useState, useEffect } from 'react';
import './SlotMachine.css';

const SlotMachine = ({ isOpen, onClose, onWinCoins, userCoins }) => {
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

  // Wszystkie symbole
  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  useEffect(() => {
    if (isOpen) {
      checkDailyLimit();
    }
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(checkDailyLimit, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkDailyLimit = () => {
    const lastPlayDate = localStorage.getItem('slotMachineLastPlay');
    const today = new Date().toDateString();

    if (lastPlayDate === today) {
      setCanPlay(false);
      calculateTimeUntilReset();
    } else {
      setCanPlay(true);
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
    setShowResult(false); // Ukryj stary wynik

    // Animacja - zmieniaj symbole w bębnach
    let count = 0;
    const interval = setInterval(() => {
      setReels([getRandomReel(), getRandomReel(), getRandomReel()]);
      count++;

      if (count >= 15) {
        clearInterval(interval);
        // Poczekaj chwilę przed pokazaniem wyniku
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
      // 10% - 3 takie same (JACKPOT)
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      finalReels = [
        [symbol, symbol, symbol],
        [symbol, symbol, symbol],
        [symbol, symbol, symbol]
      ];
    } else if (random < 0.40) {
      // 30% - 2 takie same w środkowym rzędzie
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const other1 = symbols.find(s => s !== symbol);
      const other2 = symbols.find(s => s !== symbol && s !== other1);

      finalReels = [
        [other1, symbol, other2],
        [other2, symbol, other1],
        [other1, other2, symbol]
      ];
    } else {
      // 60% - wszystkie różne
      const shuffled1 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled2 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled3 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);

      finalReels = [shuffled1, shuffled2, shuffled3];
    }

    setReels(finalReels);
    setIsSpinning(false); // Zatrzymaj kręcenie

    // Poczekaj 1 sekundę przed pokazaniem wyniku
    setTimeout(() => {
      const centerRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
      const coins = calculateWinnings(centerRow);

      setWonCoins(coins);
      setShowResult(true); // TERAZ pokaż wynik

      localStorage.setItem('slotMachineLastPlay', new Date().toDateString());
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
      return 30; // JACKPOT
    }
    if (r1 === r2 || r2 === r3 || r1 === r3) {
      return 15; // 2 takie same
    }
    return 5; // Pocieszenie
  };

  const handleClose = () => {
    if (!isSpinning && !showResult) {
      // Zamknij tylko jeśli nie kręci się I nie ma wyniku
      setShowResult(false);
      onClose();
    }
  };

  const handleResultClose = () => {
    // Zamknij wynik i wróć do widoku automatu
    setShowResult(false);
  };

  const handleFinalClose = () => {
    // Zamknij cały automat
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

        {/* PRAWDZIWY AUTOMAT */}
        <div className="slot-machine-box">
          <div className="slot-machine-screen">
            {/* Wskaźnik linii wygranej */}
            <div className="win-line"></div>

            {/* 3 PIONOWE BĘBNY */}
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

          {/* Wynik - pokazuj środkowy rząd */}
          <div className="center-display">
            <div className="center-symbols">
              {centerRow.map((symbol, idx) => (
                <span key={idx} className="center-symbol">{symbol}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Przyciski */}
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

        {/* Pop-up wyniku */}
        {showResult && (
          <div className="slot-result-popup" onClick={(e) => e.stopPropagation()}>
            <div className="slot-result-content">
              <div className="result-icon">
                {wonCoins === 30 ? '🎉' : wonCoins === 15 ? '🎊' : '👍'}
              </div>
              <h3 className="result-title">
                {wonCoins === 30 ? 'JACKPOT!' : wonCoins === 15 ? 'Świetnie!' : 'Nie złe!'}
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

        {/* Info */}
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