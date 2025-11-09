import React, { useState, useEffect } from 'react';
import './SlotMachine.css';

const SlotMachine = ({ isOpen, onClose, onWinCoins, userCoins }) => {
  const [reels, setReels] = useState(['🍌', '🍎', '🍇']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [wonCoins, setWonCoins] = useState(0);
  const [canPlay, setCanPlay] = useState(true);
  const [timeUntilReset, setTimeUntilReset] = useState('');

  // Symbole na automatach
  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥'];

  // Sprawdź czy gracz może dzisiaj grać
  useEffect(() => {
    checkDailyLimit();
    const interval = setInterval(checkDailyLimit, 60000); // Sprawdzaj co minutę
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

  const getRandomSymbol = () => {
    return symbols[Math.floor(Math.random() * symbols.length)];
  };

  const spinReels = () => {
    if (isSpinning || !canPlay) return;

    setIsSpinning(true);
    setShowResult(false);

    // Animacja kręcenia - zmieniaj symbole szybko
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
      spinCount++;

      if (spinCount >= 20) {
        clearInterval(spinInterval);
        // Ustal finalne symbole
        determineResult();
      }
    }, 100);
  };

  const determineResult = () => {
    // Losuj finalne symbole z kontrolowanym prawdopodobieństwem
    const random = Math.random();
    let finalReels;

    if (random < 0.10) {
      // 10% szans na 3 takie same (30 monet)
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      finalReels = [symbol, symbol, symbol];
    } else if (random < 0.40) {
      // 30% szans na 2 takie same (15 monet)
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const otherSymbol = symbols.find(s => s !== symbol);
      const position = Math.floor(Math.random() * 3);
      finalReels = [symbol, symbol, symbol];
      finalReels[position] = otherSymbol;
    } else {
      // 60% szans na wszystkie różne (5 monet)
      const shuffled = [...symbols].sort(() => Math.random() - 0.5);
      finalReels = [shuffled[0], shuffled[1], shuffled[2]];
      // Upewnij się że są różne
      while (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) {
        const shuffled2 = [...symbols].sort(() => Math.random() - 0.5);
        finalReels = [shuffled2[0], shuffled2[1], shuffled2[2]];
      }
    }

    setReels(finalReels);

    // Oblicz wygraną
    setTimeout(() => {
      const coins = calculateWinnings(finalReels);
      setWonCoins(coins);
      setIsSpinning(false);
      setShowResult(true);

      // Zapisz że zagrał dzisiaj
      const today = new Date().toDateString();
      localStorage.setItem('slotMachineLastPlay', today);
      setCanPlay(false);

      // Dodaj monety
      if (onWinCoins) {
        onWinCoins(coins);
      }

      calculateTimeUntilReset();
    }, 500);
  };

  const calculateWinnings = (finalReels) => {
    const [r1, r2, r3] = finalReels;

    // 3 takie same
    if (r1 === r2 && r2 === r3) {
      return 30;
    }
    // 2 takie same
    if (r1 === r2 || r2 === r3 || r1 === r3) {
      return 15;
    }
    // Wszystkie różne (pocieszenie)
    return 5;
  };

  const handleClose = () => {
    if (!isSpinning) {
      setShowResult(false);
      onClose();
    }
  };

  if (!isOpen) return null;

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
          <h2>🎰 automat z owocami 🎰</h2>
          <p className="slot-subtitle">Zagrywaj codziennie i wygrywaj!</p>
        </div>

        {/* Automat */}
        <div className="slot-machine-container">
          <div className={`slot-reels ${isSpinning ? 'spinning' : ''}`}>
            {reels.map((symbol, index) => (
              <div key={index} className="slot-reel">
                <div className="reel-symbol">{symbol}</div>
              </div>
            ))}
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
              {isSpinning ? '⏳ Kręcę...' : '🎰 ZAGRAJ!'}
            </button>
          ) : (
            <div className="slot-locked">
              <div className="locked-icon">🔒</div>
              <p className="locked-text">Już dzisiaj zagrałeś!</p>
              <p className="locked-time">Następna szansa za: {timeUntilReset}</p>
            </div>
          )}

          <div className="slot-coins-display">
            <span className="coins-label">Twoje monety:</span>
            <span className="coins-amount">🪙 {userCoins}</span>
          </div>
        </div>

        {/* Wynik */}
        {showResult && (
          <div className="slot-result-popup">
            <div className="slot-result-content">
              <div className="result-icon">
                {wonCoins === 30 ? '🎉' : wonCoins === 15 ? '🎊' : '👍'}
              </div>
              <h3 className="result-title">
                {wonCoins === 30 ? 'JACKPOT!' : wonCoins === 15 ? 'Świetnie!' : 'Nie złe!'}
              </h3>
              <p className="result-text">Wygrałeś/aś</p>
              <div className="result-coins">
                <span className="result-coins-icon">🪙</span>
                <span className="result-coins-value">{wonCoins}</span>
                <span className="result-coins-text">monet!</span>
              </div>
              <button className="result-close-btn" onClick={handleClose}>
                {wonCoins === 30 ? 'Wow! 🎉' : wonCoins === 15 ? 'Super! 🎊' : 'OK! 👌'}
              </button>
            </div>
          </div>
        )}

        {/* Informacje */}
        <div className="slot-info">
          <p className="info-text">
            <span className="info-emoji">💡</span>
            <span>3 takie same: 30🪙 • 2 takie same: 15🪙 • Inne: 5🪙</span>
          </p>
          <p className="info-text">
            <span className="info-emoji">⏰</span>
            <span>Możesz grać raz dziennie!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlotMachine;