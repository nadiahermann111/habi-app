import React, { useState, useRef } from 'react';
import './FortuneWheel.css';

const FortuneWheel = ({ isOpen, onClose, onWinCoins, userCoins }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonCoins, setWonCoins] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const wheelRef = useRef(null);

  // 8 segmentów: 4 z nagrodami + 4 puste
  const segments = [
    { coins: 5, isEmpty: false, color: '#fde68a' },     // Żółty
    { coins: 0, isEmpty: true, color: '#f3f4f6' },      // Pusty szary
    { coins: 10, isEmpty: false, color: '#bfdbfe' },    // Niebieski
    { coins: 0, isEmpty: true, color: '#f3f4f6' },      // Pusty szary
    { coins: 20, isEmpty: false, color: '#d8b4fe' },    // Fioletowy
    { coins: 0, isEmpty: true, color: '#f3f4f6' },      // Pusty szary
    { coins: 50, isEmpty: false, color: '#fecaca' },    // Różowy
    { coins: 0, isEmpty: true, color: '#f3f4f6' }       // Pusty szary
  ];

  // Prawdopodobieństwa tylko dla segmentów z nagrodami
  const prizeSegments = [
    { index: 0, coins: 5, probability: 0.50 },   // 50%
    { index: 2, coins: 10, probability: 0.30 },  // 30%
    { index: 4, coins: 20, probability: 0.15 },  // 15%
    { index: 6, coins: 50, probability: 0.05 }   // 5%
  ];

  const spinWheel = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);
    setShowResult(false);

    // Losowanie nagrody na podstawie prawdopodobieństwa
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedPrize = prizeSegments[0];

    for (const prize of prizeSegments) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }

    // Oblicz kąt obrotu
    const segmentAngle = 360 / segments.length; // 45 stopni na segment
    const spinRotations = 8; // 8 pełnych obrotów
    const targetAngle = selectedPrize.index * segmentAngle;

    // Mały losowy offset w obrębie segmentu
    const offset = (Math.random() - 0.5) * (segmentAngle * 0.4);
    const finalRotation = (spinRotations * 360) + targetAngle + offset;

    setRotation(finalRotation);

    // Po zakończeniu animacji
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setWonCoins(selectedPrize.coins);
      setShowResult(true);

      // Dodaj monety do konta użytkownika
      if (onWinCoins && selectedPrize.coins > 0) {
        onWinCoins(selectedPrize.coins);
      }
    }, 4000); // 4 sekundy animacji
  };

  const handleClose = () => {
    if (!isSpinning) {
      setShowResult(false);
      setRotation(0);
      setHasSpun(false);
      onClose();
    }
  };

  const handleTryAgain = () => {
    setShowResult(false);
    setRotation(0);
    setHasSpun(false);
    setWonCoins(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fortune-wheel-overlay" onClick={handleClose}>
      <div className="fortune-wheel-popup" onClick={(e) => e.stopPropagation()}>
        <button
          className="wheel-close-btn"
          onClick={handleClose}
          disabled={isSpinning}
          aria-label="Zamknij koło fortuny"
        >
          ✕
        </button>

        <div className="wheel-header">
          <h2>🎡 koło fortuny 🎡</h2>
          <p className="wheel-subtitle">Kręć i wygrywaj monety!</p>
        </div>

        <div className="wheel-container">
          {/* Wskaźnik (strzałka) */}
          <div className="wheel-pointer">▼</div>

          {/* Koło z nagrodami */}
          <div
            className="wheel"
            ref={wheelRef}
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            {segments.map((segment, index) => {
              const angle = (360 / segments.length) * index;
              return (
                <div
                  key={index}
                  className={`wheel-segment ${segment.isEmpty ? 'empty-segment' : ''}`}
                  style={{
                    backgroundColor: segment.color,
                    transform: `rotate(${angle}deg) skewY(-22.5deg)`
                  }}
                >
                  {!segment.isEmpty && (
                    <div
                      className="segment-content"
                      style={{
                        transform: `skewY(22.5deg) rotate(22.5deg)`
                      }}
                    >
                      <span className="segment-coins">{segment.coins}</span>
                      <span className="segment-icon">🪙</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Środek koła */}
            <div className="wheel-center">
              <div className="wheel-center-inner">🎰</div>
            </div>
          </div>
        </div>

        <div className="wheel-controls">
          {!hasSpun ? (
            <button
              className="spin-button"
              onClick={spinWheel}
              disabled={isSpinning}
            >
              {isSpinning ? '⏳ Kręcę...' : '🎯 ZAKRĘĆ!'}
            </button>
          ) : (
            <button
              className="spin-button try-again-btn"
              onClick={handleTryAgain}
              disabled={isSpinning}
            >
              🔄 Spróbuj ponownie
            </button>
          )}

          <div className="user-coins-display">
            <span className="coins-label">Twoje monety:</span>
            <span className="coins-amount">🪙 {userCoins}</span>
          </div>
        </div>

        {/* Wynik */}
        {showResult && (
          <div className="result-popup">
            <div className="result-content">
              {wonCoins > 0 ? (
                <>
                  <div className="result-icon">🎉</div>
                  <h3 className="result-title">Gratulacje!</h3>
                  <p className="result-text">Wygrałeś/aś</p>
                  <div className="result-coins">
                    <span className="result-coins-icon">🪙</span>
                    <span className="result-coins-value">{wonCoins}</span>
                    <span className="result-coins-text">monet!</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="result-icon">😢</div>
                  <h3 className="result-title">Niestety...</h3>
                  <p className="result-text">Tym razem nie wygrałeś</p>
                  <div className="result-empty">
                    <span className="empty-icon">❌</span>
                    <span className="empty-text">Puste pole!</span>
                  </div>
                </>
              )}
              <button className="result-close-btn" onClick={handleClose}>
                {wonCoins > 0 ? 'Super! 🎊' : 'OK 👌'}
              </button>
            </div>
          </div>
        )}

        {/* Informacje o szansach */}
        <div className="wheel-info">
          <p className="info-text">
            <span className="info-emoji">💡</span>
            <span>Szanse: 5🪙 (50%) • 10🪙 (30%) • 20🪙 (15%) • 50🪙 (5%)</span>
          </p>
          <p className="info-text">
            <span className="info-emoji">⚠️</span>
            <span>Możesz zakręcić tylko raz!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FortuneWheel;