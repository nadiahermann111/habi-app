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
  const currentUserRef = useRef(null);

  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  // ============================================
  // Helper funkcje dla user-specific localStorage
  // ============================================

  /**
   * Pobiera ID aktualnie zalogowanego użytkownika z localStorage
   */
  const getCurrentUserId = () => {
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
   * Zwraca klucz storage dla konkretnego użytkownika
   */
  const getStorageKey = (targetUserId) => {
    // Używaj userId z localStorage jako źródła prawdy
    const actualUserId = targetUserId || getCurrentUserId();

    if (!actualUserId) {
      console.warn('⚠️ Brak userId - nie można zapisać stanu automatu');
      return null;
    }

    return `slotMachine_lastPlay_${actualUserId}`;
  };

  /**
   * Czyści dane automatu dla starego użytkownika
   */
  const cleanupOldUserData = (oldUserId) => {
    if (oldUserId) {
      const oldKey = `slotMachine_lastPlay_${oldUserId}`;
      localStorage.removeItem(oldKey);
      console.log(`🗑️ Wyczyszczono dane automatu dla użytkownika ${oldUserId}`);
    }
  };

  /**
   * Czyści legacy klucze (stare klucze z username)
   */
  const cleanupLegacyKeys = () => {
    const cleanupKey = 'slotMachine_migrated_v3';
    const alreadyMigrated = localStorage.getItem(cleanupKey);

    if (!alreadyMigrated) {
      console.log('🧹 Czyszczenie starych kluczy automatu...');

      // Usuń wszystkie stare klucze
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.match(/^slotMachineLastPlay_/) ||
          key.match(/^slotMachine_lastPlay_user_/)
        )) {
          localStorage.removeItem(key);
          console.log(`🗑️ Usunięto stary klucz: ${key}`);
        }
      }

      localStorage.setItem(cleanupKey, 'true');
      console.log('✅ Czyszczenie zakończone');
    }
  };

  // ============================================
  // Detekcja zmiany użytkownika
  // ============================================

  useEffect(() => {
    const actualUserId = getCurrentUserId();

    // Sprawdź czy użytkownik się zmienił
    if (actualUserId !== currentUserRef.current) {
      console.log(`👤 Zmiana użytkownika: ${currentUserRef.current} → ${actualUserId}`);

      // Wyczyść dane poprzedniego użytkownika
      if (currentUserRef.current) {
        cleanupOldUserData(currentUserRef.current);
      }

      // Zaktualizuj ref
      currentUserRef.current = actualUserId;

      // Resetuj stan automatu
      setShowResult(false);
      setWonCoins(0);

      // Sprawdź czy nowy użytkownik może grać
      if (actualUserId) {
        checkDailyLimit(actualUserId);
      }
    }
  }, [userId, username, isOpen]);

  // ============================================
  // Jednorazowe czyszczenie przy montowaniu
  // ============================================

  useEffect(() => {
    cleanupLegacyKeys();
  }, []);

  // ============================================
  // Sprawdzanie limitu dziennego
  // ============================================

  useEffect(() => {
    if (isOpen) {
      const actualUserId = getCurrentUserId();
      if (actualUserId) {
        setShowResult(false);
        checkDailyLimit(actualUserId);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const actualUserId = getCurrentUserId();
    if (actualUserId) {
      const interval = setInterval(() => checkDailyLimit(actualUserId), 60000);
      return () => clearInterval(interval);
    }
  }, []);

  /**
   * Sprawdza czy użytkownik może dziś grać
   */
  const checkDailyLimit = (targetUserId) => {
    const actualUserId = targetUserId || getCurrentUserId();

    if (!actualUserId) {
      console.warn('⚠️ Brak userId - zakładam że można grać');
      setCanPlay(true);
      return;
    }

    const storageKey = getStorageKey(actualUserId);
    if (!storageKey) {
      setCanPlay(true);
      return;
    }

    const lastPlayDate = localStorage.getItem(storageKey);
    const today = new Date().toDateString();

    console.log(`🎰 Sprawdzanie automatu dla użytkownika ${actualUserId}:`);
    console.log(`  - Ostatnia gra: ${lastPlayDate || 'nigdy'}`);
    console.log(`  - Dzisiaj: ${today}`);

    if (lastPlayDate === today) {
      setCanPlay(false);
      calculateTimeUntilReset();
      console.log('  - ❌ Użytkownik już dzisiaj grał');
    } else {
      setCanPlay(true);
      setTimeUntilReset('');
      console.log('  - ✅ Użytkownik może grać');
    }
  };

  /**
   * Oblicza czas do resetu (północy)
   */
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
    if (isSpinning || !canPlay) return;

    const actualUserId = getCurrentUserId();
    if (!actualUserId) {
      console.error('❌ Brak userId - nie można grać');
      return;
    }

    console.log(`🎰 Użytkownik ${actualUserId} kręci automatem`);

    setIsSpinning(true);
    setShowResult(false);

    let count = 0;
    const interval = setInterval(() => {
      setReels([getRandomReel(), getRandomReel(), getRandomReel()]);
      count++;

      if (count >= 15) {
        clearInterval(interval);
        setTimeout(() => {
          determineResult(actualUserId);
        }, 300);
      }
    }, 100);
  };

  const determineResult = (targetUserId) => {
    const actualUserId = targetUserId || getCurrentUserId();

    if (!actualUserId) {
      console.error('❌ Brak userId - nie można zapisać wyniku');
      setIsSpinning(false);
      return;
    }

    const random = Math.random();
    let finalReels;

    // 10% szans na jackpot (3 takie same)
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
    // 60% szans na różne symbole
    else {
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

      // ✅ Zapisz datę gry dla KONKRETNEGO użytkownika
      const storageKey = getStorageKey(actualUserId);
      if (storageKey) {
        const today = new Date().toDateString();
        localStorage.setItem(storageKey, today);
        console.log(`💾 Zapisano grę dla użytkownika ${actualUserId}: ${today}`);
      }

      setCanPlay(false);

      // Przekaż wygrane monety do parent componentu
      if (onWinCoins) {
        onWinCoins(coins);
      }

      calculateTimeUntilReset();

      console.log(`🎰 Wynik: ${coins} monet (${centerRow.join(' ')})`);
    }, 1000);
  };

  const calculateWinnings = (centerRow) => {
    const [r1, r2, r3] = centerRow;

    // 3 takie same - JACKPOT!
    if (r1 === r2 && r2 === r3) {
      return 30;
    }
    // 2 takie same
    if (r1 === r2 || r2 === r3 || r1 === r3) {
      return 15;
    }
    // Wszystkie różne
    return 5;
  };

  // ============================================
  // Obsługa zamykania
  // ============================================

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

  // ============================================
  // Renderowanie
  // ============================================

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

