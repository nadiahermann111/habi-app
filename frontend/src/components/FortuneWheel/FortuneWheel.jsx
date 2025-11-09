import React, { useState, useEffect } from 'react';

const FortuneWheelModal = ({ isOpen, onClose, onSpinComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canSpin, setCanSpin] = useState(true);
  const [prize, setPrize] = useState(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);

  const segments = [
    { id: 1, label: '5m', coins: 5, weight: 30, color: '#FFB6D9' },
    { id: 2, label: 'Pu', coins: 0, weight: 20, color: '#FFF4B8' },
    { id: 3, label: '10m', coins: 10, weight: 25, color: '#D4F4DD' },
    { id: 4, label: 'Pu', coins: 0, weight: 20, color: '#E8D5F2' },
    { id: 5, label: '20m', coins: 20, weight: 15, color: '#FFD4B8' },
    { id: 6, label: 'Pu', coins: 0, weight: 20, color: '#B8E6FF' },
    { id: 7, label: '50m', coins: 50, weight: 5, color: '#FFDAF0' },
    { id: 8, label: 'Pu', coins: 0, weight: 20, color: '#FFF9C4' }
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #fff5f7 0%, #fff9e6 100%)',
        borderRadius: '30px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(255, 105, 180, 0.4)',
        position: 'relative'
      }} onClick={(e) => e.stopPropagation()}>

        <button onClick={onClose} style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'transparent',
          border: 'none',
          fontSize: '30px',
          cursor: 'pointer',
          color: '#FF69B4',
          lineHeight: '1'
        }}>×</button>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontSize: '2rem',
            color: '#FF69B4',
            marginBottom: '10px',
            textShadow: '2px 2px 4px rgba(255, 182, 217, 0.3)'
          }}>🎡 Koło Fortuny</h2>

          <p style={{
            fontSize: '1rem',
            color: '#D946B4',
            marginBottom: '30px',
            opacity: 0.8
          }}>Zakręć raz dziennie i wygraj monety!</p>

          <div style={{ position: 'relative', width: '350px', height: '350px', margin: '0 auto 30px' }}>
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '2.5rem',
              color: '#FF69B4',
              zIndex: 10,
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
            }}>▼</div>

            <svg width="350" height="350" viewBox="0 0 350 350" style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
              filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2))'
            }}>
              <circle cx="175" cy="175" r="165" fill="white" stroke="#FFB6D9" strokeWidth="3"/>

              {segments.map((segment, index) => {
                const angle = (360 / segments.length) * index;
                const segmentAngle = 360 / segments.length;
                const startAngle = angle - 90;
                const endAngle = startAngle + segmentAngle;

                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 175 + 165 * Math.cos(startRad);
                const y1 = 175 + 165 * Math.sin(startRad);
                const x2 = 175 + 165 * Math.cos(endRad);
                const y2 = 175 + 165 * Math.sin(endRad);

                const textAngle = angle;
                const textRad = (textAngle * Math.PI) / 180;
                const textX = 175 + 115 * Math.cos(textRad);
                const textY = 175 + 115 * Math.sin(textRad);

                return (
                  <g key={segment.id}>
                    <path
                      d={`M 175 175 L ${x1} ${y1} A 165 165 0 0 1 ${x2} ${y2} Z`}
                      fill={segment.color}
                      stroke="rgba(255, 255, 255, 0.5)"
                      strokeWidth="2"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill="#333"
                      fontSize="18"
                      fontWeight="bold"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                      style={{ textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8)' }}
                    >
                      {segment.label}
                    </text>
                  </g>
                );
              })}

              <circle cx="175" cy="175" r="40" fill="url(#gradient)" filter="drop-shadow(0 4px 8px rgba(255, 105, 180, 0.4))"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF69B4"/>
                  <stop offset="100%" stopColor="#FFB6D9"/>
                </linearGradient>
              </defs>
              <text x="175" y="175" fill="white" fontSize="16" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                SPIN
              </text>
            </svg>
          </div>

          <button onClick={spinWheel} disabled={!canSpin || isSpinning} style={{
            padding: '15px 50px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: 'white',
            background: !canSpin || isSpinning ? 'linear-gradient(135deg, #D1D5DB, #9CA3AF)' : 'linear-gradient(135deg, #FF69B4, #FFB6D9)',
            border: 'none',
            borderRadius: '50px',
            cursor: !canSpin || isSpinning ? 'not-allowed' : 'pointer',
            boxShadow: !canSpin || isSpinning ? 'none' : '0 4px 15px rgba(255, 105, 180, 0.4)',
            transition: 'all 0.3s ease',
            opacity: !canSpin || isSpinning ? 0.6 : 1,
            marginBottom: '15px'
          }}>
            {isSpinning ? '⏳ Kręcenie...' : !canSpin ? '🔒 Wróć jutro!' : '✨ Zakręć kołem!'}
          </button>

          <button onClick={resetDaily} style={{
            padding: '8px 25px',
            fontSize: '0.9rem',
            color: '#666',
            background: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '25px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            🔄 Reset (test)
          </button>
        </div>

        {showPrizeModal && prize && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '30px'
          }} onClick={() => setShowPrizeModal(false)}>
            <div style={{
              background: 'linear-gradient(135deg, #fff5f7 0%, #fffbf0 100%)',
              padding: '40px',
              borderRadius: '25px',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(255, 105, 180, 0.5)',
              maxWidth: '350px'
            }} onClick={(e) => e.stopPropagation()}>
              {prize.coins > 0 ? (
                <>
                  <h2 style={{ fontSize: '2rem', color: '#FF69B4', marginBottom: '20px' }}>🎉 Gratulacje!</h2>
                  <div style={{ fontSize: '4rem', margin: '20px 0' }}>🪙</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#FFB800', marginBottom: '10px' }}>
                    +{prize.coins}
                  </div>
                  <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '25px' }}>
                    Wygrałeś {prize.coins} monet!
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: '2rem', color: '#FF69B4', marginBottom: '20px' }}>😔 Niestety...</h2>
                  <p style={{ fontSize: '1.8rem', color: '#999', margin: '30px 0' }}>Tym razem puste pole</p>
                  <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '25px' }}>Spróbuj szczęścia jutro!</p>
                </>
              )}
              <button onClick={() => setShowPrizeModal(false)} style={{
                padding: '12px 40px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: 'white',
                background: 'linear-gradient(135deg, #FF69B4, #FFB6D9)',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(255, 105, 180, 0.4)'
              }}>
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Demo component
export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalCoins, setTotalCoins] = useState(100);

  const handleSpinComplete = (coins) => {
    setTotalCoins(prev => prev + coins);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #ffeef5 0%, #fff9db 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '30px 50px',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(255, 182, 217, 0.3)',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#FF69B4', marginBottom: '10px' }}>Twoje monety</h1>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#FFB800' }}>
          🪙 {totalCoins}
        </div>
      </div>

      <button onClick={() => setIsModalOpen(true)} style={{
        padding: '20px 40px',
        fontSize: '1.3rem',
        fontWeight: 'bold',
        color: 'white',
        background: 'linear-gradient(135deg, #FF69B4, #FFB6D9)',
        border: 'none',
        borderRadius: '50px',
        cursor: 'pointer',
        boxShadow: '0 8px 25px rgba(255, 105, 180, 0.4)',
        transition: 'all 0.3s ease'
      }}>
        🎡 Otwórz Koło Fortuny
      </button>

      <FortuneWheelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSpinComplete={handleSpinComplete}
      />
    </div>
  );
}