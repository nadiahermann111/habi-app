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
  const isCheckingRef = useRef(false);

  const symbols = ['🍌', '🍎', '🍇', '🍊', '🍓', '🥥', '🍋', '🍑'];

  // ============================================
  // Storage helpers (FALLBACK dla offline mode)
  // ============================================

  const getStorageKey = (targetUserId) => {
    const actualUserId = targetUserId || userId;
    if (!actualUserId) return null;
    return `slotMachine_lastPlay_user_${actualUserId}`;
  };

  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const cleanupLegacyKeys = () => {
    const migrationKey = 'slotMachine_cleaned_v7';
    if (localStorage.getItem(migrationKey)) return;

    console.log('🧹 Czyszczenie starych kluczy automatu...');
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('slotMachineLastPlay_') ||
        key.startsWith('slotMachine_v') ||
        key === 'slotMachineLastPlay' ||
        key.startsWith('slotMachine_cleaned_')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.setItem(migrationKey, 'true');
    console.log(`✅ Wyczyszczono ${keysToRemove.length} starych kluczy`);
  };

  // ============================================
  // Effects
  // ============================================

  useEffect(() => {
    cleanupLegacyKeys();
  }, []);

  useEffect(() => {
    if (userId && userId !== previousUserIdRef.current) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 Zmiana użytkownika: ${previousUserIdRef.current} → ${userId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setShowResult(false);
      setWonCoins(0);
      setIsSpinning(false);
      setTimeUntilReset('');

      previousUserIdRef.current = userId;
      isCheckingRef.current = false;

      checkDailyLimitFromBackend(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      console.log(`🎰 Automat otwarty dla userId: ${userId}`);
      setShowResult(false);

      if (!isCheckingRef.current) {
        checkDailyLimitFromBackend(userId);
      }
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (!userId || canPlay) return;

    const interval = setInterval(() => {
      calculateTimeUntilReset();
    }, 60000);

    return () => clearInterval(interval);
  }, [userId, canPlay]);

  // ============================================
  // Sprawdzanie limitu - BACKEND
  // ============================================

  const checkDailyLimitFromBackend = async (targetUserId) => {
    if (isCheckingRef.current) {
      console.log('⚠️ checkDailyLimit już się wykonuje, pomijam');
      return;
    }

    isCheckingRef.current = true;

    const actualUserId = targetUserId || userId;

    if (!actualUserId) {
      console.warn('⚠️ checkDailyLimit: Brak userId');
      setCanPlay(true);
      isCheckingRef.current = false;
      return;
    }

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        console.warn('⚠️ Brak tokenu - używam localStorage jako fallback');
        checkDailyLimitFromLocalStorage(actualUserId);
        isCheckingRef.current = false;
        return;
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📅 Sprawdzanie limitu automatu (BACKEND):');
      console.log(`   User ID: ${actualUserId}`);

      const response = await fetch('https://habi-backend.onrender.com/api/slot-machine/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`   Backend odpowiedź:`, data);

      if (data.can_play) {
        console.log('   ✅ Użytkownik może grać');
        setCanPlay(true);
        setTimeUntilReset('');
      } else {
        console.log('   ❌ Użytkownik już dzisiaj grał');
        setCanPlay(false);
        calculateTimeUntilReset();
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
      console.error('❌ Błąd sprawdzania limitu na backendzie:', error);
      console.log('📱 Fallback do localStorage');
      checkDailyLimitFromLocalStorage(actualUserId);
    } finally {
      setTimeout(() => {
        isCheckingRef.current = false;
      }, 100);
    }
  };

  // Fallback do localStorage (tryb offline)
  const checkDailyLimitFromLocalStorage = (actualUserId) => {
    const storageKey = getStorageKey(actualUserId);
    if (!storageKey) {
      setCanPlay(true);
      return;
    }

    const lastPlayDate = localStorage.getItem(storageKey);
    const today = getTodayString();

    console.log('📱 Tryb offline - używam localStorage');
    console.log(`   Ostatnia gra: ${lastPlayDate || 'NIGDY'}`);
    console.log(`   Dzisiaj: ${today}`);

    if (lastPlayDate === today) {
      console.log('   ❌ Limit localStorage aktywny');
      setCanPlay(false);
      calculateTimeUntilReset();
    } else {
      console.log('   ✅ Można grać (localStorage)');
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

  const spinReels = async () => {
    if (isSpinning || !canPlay) {
      console.log('⚠️ Nie można kręcić:', { isSpinning, canPlay });
      return;
    }

    if (!userId) {
      console.error('❌ Brak userId - nie można grać');
      alert('Błąd: Brak identyfikatora użytkownika');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎰 ROZPOCZĘCIE GRY');
    console.log(`   User ID: ${userId}`);

    try {
      const token = localStorage.getItem('token');

      if (token) {
        // ✅ Zapisz na backendzie
        console.log('📤 Zapisywanie gry na backendzie...');

        const response = await fetch('https://habi-backend.onrender.com/api/slot-machine/play', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Błąd serwera' }));
          throw new Error(errorData.detail || 'Błąd zapisu gry');
        }

        const data = await response.json();
        console.log('✅ Backend potwierdził:', data);
      } else {
        console.warn('⚠️ Brak tokenu - zapis tylko lokalny');
      }

    } catch (error) {
      console.error('❌ Błąd zapisywania na backendzie:', error);
      alert(`Błąd: ${error.message}\n\nSpróbuj ponownie później.`);

      // Przywróć możliwość gry jeśli nie udało się zapisać
      setCanPlay(true);
      return;
    }

    // ✅ Zapisz lokalnie jako backup
    const storageKey = getStorageKey(userId);
    const today = getTodayString();

    if (storageKey) {
      localStorage.setItem(storageKey, today);
      console.log(`💾 Backup w localStorage: ${storageKey} = ${today}`);
    }

    // Natychmiast zablokuj możliwość ponownej gry
    setCanPlay(false);
    calculateTimeUntilReset();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Rozpocznij animację kręcenia
    setIsSpinning(true);
    setShowResult(false);
    setWonCoins(0);

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

  const determineResult = async (targetUserId) => {
    const actualUserId = targetUserId || userId;

    if (!actualUserId) {
      console.error('❌ determineResult: Brak userId');
      setIsSpinning(false);
      return;
    }

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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎊 WYNIK GRY:');
      console.log(`   Symbole: ${centerRow.join(' ')}`);
      console.log(`   Wygrana: ${coins} monet`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // ✅ Dodaj monety przez onWinCoins
      if (coins > 0 && onWinCoins) {
        console.log(`💰 Dodawanie ${coins} monet...`);

        try {
          await onWinCoins(coins);
          console.log('✅ Monety dodane pomyślnie');
        } catch (error) {
          console.error('❌ Błąd dodawania monet:', error);
          alert('Nie udało się dodać monet. Spróbuj ponownie później.');
        }
      }

      // ✅ Pokaż wynik
      console.log('🎉 Pokazywanie wyniku');
      setWonCoins(coins);
      setShowResult(true);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ GRA ZAKOŃCZONA');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    }, 1000);
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

  // ✅ Funkcja debugowania (USUŃ W PRODUKCJI!)
  const handleDebugReset = () => {
    if (!userId) return;

    console.log('🔧 DEBUG: Reset limitu automatu');

    // Reset localStorage
    const storageKey = getStorageKey(userId);
    if (storageKey) {
      localStorage.removeItem(storageKey);
      console.log('   ✓ Usunięto klucz localStorage:', storageKey);
    }

    // Ponowne sprawdzenie limitu
    checkDailyLimitFromBackend(userId);
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
              {timeUntilReset && (
                <p className="locked-time">Następna gra za: {timeUntilReset}</p>
              )}

              {/* 🔧 DEBUG - USUŃ TO PRZED WDROŻENIEM PRODUKCYJNYM! */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleDebugReset}
                  style={{
                    fontSize: '10px',
                    padding: '2px 5px',
                    marginTop: '5px',
                    opacity: 0.3,
                    cursor: 'pointer'
                  }}
                >
                  🔧 Debug: Reset limitu
                </button>
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