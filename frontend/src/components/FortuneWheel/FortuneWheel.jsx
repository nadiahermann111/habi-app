// FortuneWheel.jsx
import React, { useState, useEffect } from 'react';
import './FortuneWheel.css';

const FortuneWheel = ({ isOpen, onClose, onSpinComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  const segments = [
    { id: 1, label: '5 monet', coins: 5, weight: 30, color: '#FFB6D9' },
    { id: 2, label: 'Puste', coins: 0, weight: 20, color: '#FFF4B8' },
    { id: 3, label: '10 monet', coins: 10, weight: 25, color: '#D4F4DD' },
    { id: 4, label: 'Puste', coins: 0, weight: 20, color: '#E8D5F2' },
    { id: 5, label: '20 monet', coins: 20, weight: 15, color: '#FFD4B8' },
    { id: 6, label: 'Puste', coins: 0, weight: 20, color: '#B8E6FF' },
    { id: 7, label: '50 monet', coins: 50, weight: 5, color: '#FFDAF0' },
    { id: 8, label: 'Puste', coins: 0, weight: 20, color: '#FFF9C4' }
  ];

  useEffect(() => {
    const lastSpinDate = sessionStorage.getItem('lastSpinDate');
    const today = new Date().toDateString();
    if (lastSpinDate === today) {
      setCanSpin(false);
    }
  }, []);

  const selectPrize = () => {
    const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
    let random = Math.random() * totalWeight;
    for (let segment of segments) {
      if (random < segment.weight) return segment;
      random -= segment.weight;
    }
    return segments[0];
  };

  const spinWheel = () => {
    if (!canSpin || isSpinning) return;
    setIsSpinning(true);
    setPrize(null);

    const selectedPrize = selectPrize();
    const segmentAngle = 360 / segments.length;
    const index = segments.findIndex(s => s.id === selectedPrize.id);
    const targetAngle = index * segmentAngle;
    const spins = 5 + Math.random() * 2;
    const totalRotation = rotation + (360 * spins) + (360 - targetAngle) + (segmentAngle / 2);

    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setPrize(selectedPrize);
      setShowPrizeModal(true);
      setCanSpin(false);
      sessionStorage.setItem('lastSpinDate', new Date().toDateString());
      if (selectedPrize.coins > 0 && onSpinComplete) {
        onSpinComplete(selectedPrize.coins);
      }
    }, 5000);
  };

  const resetDaily = () => {
    sessionStorage.removeItem('lastSpinDate');
    setCanSpin(true);
    setPrize(null);
    setShowPrizeModal(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="wheel-header">
          <h2 className="wheel-title">🎡 Koło Fortuny</h2>
          <p className="wheel-subtitle">Zakręć raz dziennie i wygraj monety!</p>
        </div>

        <div className="wheel-container">
          <div className="wheel-pointer">▼</div>

          <svg 
            className={`wheel-svg ${isSpinning ? 'spinning' : ''}`}
            width="350" 
            height="350" 
            viewBox="0 0 350 350"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <circle cx="175" cy="175" r="165" fill="white" stroke="#FFB6D9" strokeWidth="3"/>

            {segments.map((segment, index) => {
              const segmentAngle = 360 / segments.length;
              const startAngle = (segmentAngle * index) - 90;
              const endAngle = startAngle + segmentAngle;

              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 175 + 165 * Math.cos(startRad);
              const y1 = 175 + 165 * Math.sin(startRad);
              const x2 = 175 + 165 * Math.cos(endRad);
              const y2 = 175 + 165 * Math.sin(endRad);

              const textAngle = (segmentAngle * index);
              const textRad = (textAngle * Math.PI) / 180;
              const textX = 175 + 110 * Math.cos(textRad);
              const textY = 175 + 110 * Math.sin(textRad);

              return (
                <g key={segment.id}>
                  <path
                    d={`M 175 175 L ${x1} ${y1} A 165 165 0 0 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="#333"
                    fontSize="16"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF69B4"/>
                <stop offset="100%" stopColor="#FFB6D9"/>
              </linearGradient>
            </defs>
            <circle cx="175" cy="175" r="40" fill="url(#centerGradient)"/>
            <text x="175" y="175" fill="white" fontSize="18" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
              SPIN
            </text>
          </svg>
        </div>

        <div className="wheel-controls">
          <button 
            className={`spin-button ${!canSpin || isSpinning ? 'disabled' : ''}`}
            onClick={spinWheel}
            disabled={!canSpin || isSpinning}
          >
            {isSpinning ? '⏳ Kręcenie...' : !canSpin ? '🔒 Wróć jutro!' : '✨ Zakręć kołem!'}
          </button>

          <button className="reset-button" onClick={resetDaily}>
            🔄 Reset (test)
          </button>
        </div>

        {showPrizeModal && prize && (
          <div className="prize-overlay" onClick={() => setShowPrizeModal(false)}>
            <div className="prize-content" onClick={(e) => e.stopPropagation()}>
              {prize.coins > 0 ? (
                <>
                  <h2 className="prize-title">🎉 Gratulacje!</h2>
                  <div className="prize-coin-icon">🪙</div>
                  <div className="prize-amount">+{prize.coins}</div>
                  <p className="prize-text">Wygrałeś {prize.coins} monet!</p>
                </>
              ) : (
                <>
                  <h2 className="prize-title">😔 Niestety...</h2>
                  <p className="prize-empty">Tym razem puste pole</p>
                  <p className="prize-text">Spróbuj szczęścia jutro!</p>
                </>
              )}
              <button className="prize-button" onClick={() => setShowPrizeModal(false)}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FortuneWheel;