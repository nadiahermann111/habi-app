import React, { useState, useEffect, useRef } from 'react';
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
  const [loading, setLoading] = useState(false);

  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  // ============================================
  // Sprawdzanie czy użytkownik może grać (z backendu)
  // ============================================

  const checkCanPlay = async () => {
    if (!userId) {
      console.warn('⚠️ Brak userId');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('❌ Brak tokenu');
        return;
      }

      const response = await fetch('https://habi-backend.onrender.com/api/slot-machine/can-play', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Błąd sprawdzania statusu automatu');
      }

      const data = await response.json();

      console.log('🎰 Status automatu:', data);

      setCanPlay(data.can_play);
      setTimeUntilReset(data.time_until_reset || '');

    } catch (error) {
      console.error('❌ Błąd sprawdzania automatu:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Zapisywanie gry w backendzie
  // ============================================

  const savePlayToBackend = async () => {
    if (!userId) {
      console.error('❌ Brak userId - nie można zapisać gry');
      return false;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('❌ Brak tokenu');
        return false;
      }

      const response = await fetch('https://habi-backend.onrender.com/api/slot-machine/play', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Błąd zapisywania gry:', error);
        return false;
      }

      const data = await response.json();
      console.log('💾 Gra zapisana w backendzie:', data);

      return true;

    } catch (error) {
      console.error('❌ Błąd zapisywania gry:', error);
      return false;
    }
  };

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    if (isOpen && userId) {
      setShowResult(false);
      checkCanPlay();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (userId && !canPlay) {
      const interval = setInterval(() => {
        // Przelicz czas co minutę
        checkCanPlay();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [userId, canPlay]);

  // ============================================
  // Logika automatu
  // ============================================

  const getRandomReel = () => {
    const reel = [];
    for (let i = 0; i < 3; i++) {
      reel.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    return reel;
  };

  const spinReels = () => {
    if (isSpinning || !canPlay || loading) {
      console.log('⚠️ Nie można kręcić:', { isSpinning, canPlay, loading });
      return;
    }

    if (!userId) {
      console.error('❌ Brak userId - nie można grać');
      return;
    }

    console.log(`🎰 userId ${userId} kręci automatem`);

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

  const determineResult = async () => {
    const random = Math.random();
    let finalReels;

    // 10% szans na jackpot
    if (random < 0.10) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      finalReels = [
        [symbol, symbol, symbol],
        [symbol, symbol, symbol],
        [symbol, symbol, symbol]
      ];
    }
    // 30% szans na 2 takie same
    else if (random < 0.40) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const other1 = symbols.find(s => s !== symbol);
      const other2 = symbols.find(s => s !== symbol && s !== other1);

      finalReels = [
        [other1, symbol, other2],
        [other2, symbol, other1],
        [other1, other2, symbol]
      ];
    }
    // 60% szans na różne
    else {
      const shuffled1 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled2 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);
      const shuffled3 = [...symbols].sort(() => Math.random() - 0.5).slice(0, 3);

      finalReels = [shuffled1, shuffled2, shuffled3];
    }

    setReels(finalReels);
    setIsSpinning(false);

    setTimeout(async () => {
      const centerRow = [finalReels[0][1], finalReels[1][1], finalReels[2][1]];
      const coins = calculateWinnings(centerRow);

      setWonCoins(coins);
      setShowResult(true);

      // ✅ Zapisz grę w backendzie
      const saved = await savePlayToBackend();

      if (saved) {
        setCanPlay(false);

        // Przekaż wygrane monety
        if (onWinCoins) {
          onWinCoins(coins);
        }

        // Odśwież status
        checkCanPlay();
      } else {
        console.error('❌ Nie udało się zapisać gry');
      }

      console.log(`🎰 Wynik: ${coins} monet (${centerRow.join(' ')})`);
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
          {loading ? (
            <div className="slot-loading">
              <p>⏳ Ładowanie...</p>
            </div>
          ) : canPlay ? (
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
              {timeUntilReset && (
                <p className="locked-time">Następna gra za: {timeUntilReset}</p>
              )}
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