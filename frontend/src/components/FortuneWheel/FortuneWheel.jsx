import React, { useState, useRef } from 'react';
import './FortuneWheel.css';

const FortuneWheel = ({ isOpen, onClose, onWinCoins, userCoins }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [wonCoins, setWonCoins] = useState(0);
  const wheelRef = useRef(null);

  // Nagrody z różnymi prawdopodobieństwami
  const prizes = [
    { coins: 5, probability: 0.45, color: '#fde68a', angle: 0 },      // 45% - żółty pastel
    { coins: 10, probability: 0.30, color: '#bfdbfe', angle: 90 },    // 30% - niebieski pastel
    { coins: 5, probability: 0.45, color: '#fde68a', angle: 180 },    // 45% - żółty pastel
    { coins: 20, probability: 0.15, color: '#d8b4fe', angle: 270 },   // 15% - fioletowy pastel
    { coins: 5, probability: 0.45, color: '#fde68a', angle: 360 },    // 45% - żółty pastel
    { coins: 10, probability: 0.30, color: '#bfdbfe', angle: 450 },   // 30% - niebieski pastel
    { coins: 5, probability: 0.45, color: '#fde68a', angle: 540 },    // 45% - żółty pastel
    { coins: 50, probability: 0.05, color: '#fecaca', angle: 630 }    // 5% - różowy pastel (najtrudniejszy)
  ];

  const spinWheel = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);

    // Losowanie nagrody na podstawie prawdopodobieństwa
    const random = Math.random();
    let cumulativeProbability = 0;
    let selectedPrize = prizes[0];

    for (const prize of prizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        selectedPrize = prize;
        break;
      }
    }

    // Oblicz kąt obrotu (kilka pełnych obrotów + docelowy segment)
    const spinRotations = 5 + Math.random() * 3; // 5-8 pełnych obrotów
    const segmentAngle = 360 / prizes.length; // 45 stopni na segment
    const prizeIndex = prizes.findIndex(p => p.coins === selectedPrize.coins && p.angle === selectedPrize.angle);
    const targetAngle = prizeIndex * segmentAngle;

    // Dodaj losowy offset w obrębie segmentu dla bardziej naturalnego efektu
    const offset = (Math.random() - 0.5) * segmentAngle * 0.6;
    const finalRotation = rotation + (spinRotations * 360) + (360 - targetAngle) + offset;

    setRotation(finalRotation);

    // Po zakończeniu animacji
    setTimeout(() => {
      setIsSpinning(false);
      setWonCoins(selectedPrize.coins);
      setShowResult(true);

      // Dodaj monety do konta użytkownika
      if (onWinCoins) {
        onWinCoins(selectedPrize.coins);
      }
    }, 5000); // Czas trwania animacji
  };

  const handleClose = () => {
    if (!isSpinning) {
      setShowResult(false);
      setRotation(0);
      onClose();
    }
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
          <h2>🎡 Koło Fortuny 🎡</h2>
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
              transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            {prizes.map((prize, index) => (
              <div
                key={index}
                className="wheel-segment"
                style={{
                  backgroundColor: prize.color,
                  transform: `rotate(${index * (360 / prizes.length)}deg)`
                }}
              >
                <div className="segment-content">
                  <span className="segment-coins">{prize.coins}</span>
                  <span className="segment-icon">🪙</span>
                </div>
              </div>
            ))}

            {/* Środek koła */}
            <div className="wheel-center">
              <div className="wheel-center-inner">🎰</div>
            </div>
          </div>
        </div>

        <div className="wheel-controls">
          <button
            className="spin-button"
            onClick={spinWheel}
            disabled={isSpinning}
          >
            {isSpinning ? '⏳ Kręcę...' : '🎯 ZAKRĘĆ!'}
          </button>

          <div className="user-coins-display">
            <span className="coins-label">Twoje monety:</span>
            <span className="coins-amount">🪙 {userCoins}</span>
          </div>
        </div>

        {/* Wynik */}
        {showResult && (
          <div className="result-popup">
            <div className="result-content">
              <div className="result-icon">🎉</div>
              <h3 className="result-title">Gratulacje!</h3>
              <p className="result-text">Wygrałeś/aś</p>
              <div className="result-coins">
                <span className="result-coins-icon">🪙</span>
                <span className="result-coins-value">{wonCoins}</span>
                <span className="result-coins-text">monet!</span>
              </div>
              <button className="result-close-btn" onClick={handleClose}>
                Super! 🎊
              </button>
            </div>
          </div>
        )}

        {/* Informacje o szansach */}
        <div className="wheel-info">
          <p className="info-text">
            <span className="info-emoji">💡</span>
            <span>Szanse: 5🪙 (45%) • 10🪙 (30%) • 20🪙 (15%) • 50🪙 (5%)</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default FortuneWheel;