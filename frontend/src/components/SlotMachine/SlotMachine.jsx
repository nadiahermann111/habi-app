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
  const previousUserIdRef = useRef(null);

  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  // ============================================
  // Helper funkcje dla user-specific localStorage
  // ============================================

  /**
   * Zwraca klucz storage dla konkretnego użytkownika
   * UŻYWA userId Z PROPS JAKO ŹRÓDŁA PRAWDY
   */
  const getStorageKey = (targetUserId) => {
    const actualUserId = targetUserId || userId;

    if (!actualUserId) {
      console.warn('⚠️ SlotMachine: Brak userId');
      return null;
    }

    return `slotMachine_v4_user_${actualUserId}`;
  };

  /**
   * Czyści legacy klucze (wszystkie stare formaty)
   */
  const cleanupAllLegacyKeys = () => {
    const migrationKey = 'slotMachine_cleaned_v4';
    const alreadyCleaned = localStorage.getItem(migrationKey);

    if (!alreadyCleaned) {
      console.log('🧹 SlotMachine: Czyszczenie wszystkich starych kluczy...');

      const keysToRemove = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('slotMachineLastPlay_') ||
          key.startsWith('slotMachine_lastPlay_') ||
          key.startsWith('slotMachine_v3_')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Usunięto: ${key}`);
      });

      localStorage.setItem(migrationKey, 'true');
      console.log(`✅ Wyczyszczono ${keysToRemove.length} starych kluczy`);
    }
  };

  // ============================================
  // Czyszczenie przy montowaniu - TYLKO RAZ
  // ============================================

  useEffect(() => {
    cleanupAllLegacyKeys();
  }, []);

  // ============================================
  // Detekcja zmiany użytkownika
  // ============================================

  useEffect(() => {
    // Sprawdź czy userId się zmienił
    if (userId && userId !== previousUserIdRef.current) {
      console.log(`👤 SlotMachine: Zmiana użytkownika ${previousUserIdRef.current} → ${userId}`);

      // Resetuj stan automatu
      setShowResult(false);
      setWonCoins(0);
      setIsSpinning(false);

      // Zaktualizuj ref
      previousUserIdRef.current = userId;

      // Sprawdź czy nowy użytkownik może grać
      checkDailyLimit(userId);
    }
  }, [userId]);

  // ============================================
  // Sprawdzanie limitu przy otwarciu
  // ============================================

  useEffect(() => {
    if (isOpen && userId) {
      console.log(`🎰 SlotMachine otwarto dla userId: ${userId}`);
      setShowResult(false);
      checkDailyLimit(userId);
    }
  }, [isOpen, userId]);

  // ============================================
  // Timer odświeżający czas do resetu
  // ============================================

  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      if (!canPlay) {
        calculateTimeUntilReset();
      }
    }, 60000); // Co minutę

    return () => clearInterval(interval);
  }, [userId, canPlay]);

  // ============================================
  // Funkcja sprawdzająca czy użytkownik może grać
  // ============================================

  const checkDailyLimit = (targetUserId) => {
    const actualUserId = targetUserId || userId;

    if (!actualUserId) {
      console.warn('⚠️ checkDailyLimit: Brak userId');
      setCanPlay(true);
      return;
    }

    const storageKey = getStorageKey(actualUserId);
    if (!storageKey) {
      console.warn('⚠️ checkDailyLimit: Nie można utworzyć klucza');
      setCanPlay(true);
      return;
    }

    const lastPlayDate = localStorage.getItem(storageKey);
    const today = new Date().toDateString();

    console.log(`📅 Sprawdzanie limitu dla userId ${actualUserId}:`);
    console.log(`   Key: ${storageKey}`);
    console.log(`   Ostatnia gra: ${lastPlayDate || 'NIGDY'}`);
    console.log(`   Dzisiaj: ${today}`);

    if (lastPlayDate === today) {
      console.log(`   ❌ Ten użytkownik już dzisiaj grał`);
      setCanPlay(false);
      calculateTimeUntilReset();
    } else {
      console.log(`   ✅ Ten użytkownik może grać`);
      setCanPlay(true);
      setTimeUntilReset('');
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
    if (isSpinning || !canPlay) {
      console.log('⚠️ Nie można kręcić:', { isSpinning, canPlay });
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
          determineResult(userId);
        }, 300);
      }
    }, 100);
  };

  const determineResult = (targetUserId) => {
    const actualUserId = targetUserId || userId;

    if (!actualUserId) {
      console.error('❌ determineResult: Brak userId');
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
        console.log(`💾 Zapisano grę: ${storageKey} = ${today}`);
        console.log(`   userId: ${actualUserId}`);
      } else {
        console.error('❌ Nie można zapisać - brak storageKey');
      }

      setCanPlay(false);
      calculateTimeUntilReset();

      // Przekaż wygrane monety do parent componentu
      if (onWinCoins) {
        onWinCoins(coins);
      }

      console.log(`🎊 Wynik: ${coins} monet (${centerRow.join(' ')})`);
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