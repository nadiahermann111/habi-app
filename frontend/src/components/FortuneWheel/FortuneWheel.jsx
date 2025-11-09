import React, { useState, useEffect } from 'react';
import './FortuneWheel.css';

const FortuneWheel = ({ onSpinComplete }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [canSpin, setCanSpin] = useState(true);
    const [prize, setPrize] = useState(null);
    const [showPrizeModal, setShowPrizeModal] = useState(false);

    // Definicja segmentów koła (8 segmentów)
    const segments = [
        { id: 1, label: '5 monet', coins: 5, weight: 30, color: '#FFB6D9' }, // pastelowy róż
        { id: 2, label: 'Puste', coins: 0, weight: 20, color: '#FFF4B8' }, // butter yellow
        { id: 3, label: '10 monet', coins: 10, weight: 25, color: '#D4F4DD' }, // pastelowa mięta
        { id: 4, label: 'Puste', coins: 0, weight: 20, color: '#E8D5F2' }, // pastelowy lawendowy
        { id: 5, label: '20 monet', coins: 20, weight: 15, color: '#FFD4B8' }, // pastelowy brzoskwiniowy
        { id: 6, label: 'Puste', coins: 0, weight: 20, color: '#B8E6FF' }, // pastelowy niebieski
        { id: 7, label: '50 monet', coins: 50, weight: 5, color: '#FFDAF0' }, // jasny różowy
        { id: 8, label: 'Puste', coins: 0, weight: 20, color: '#FFF9C4' } // jasny żółty
    ];

    // Sprawdź czy użytkownik może kręcić kołem (raz dziennie)
    useEffect(() => {
        const lastSpinDate = localStorage.getItem('lastSpinDate');
        const today = new Date().toDateString();

        if (lastSpinDate === today) {
            setCanSpin(false);
        }
    }, []);

    // Funkcja wybierająca nagrodę na podstawie wag
    const selectPrize = () => {
        const totalWeight = segments.reduce((sum, seg) => sum + seg.weight, 0);
        let random = Math.random() * totalWeight;

        for (let segment of segments) {
            if (random < segment.weight) {
                return segment;
            }
            random -= segment.weight;
        }
        return segments[0]; // fallback
    };

    // Oblicz kąt dla danego segmentu
    const getSegmentAngle = (segmentId) => {
        const segmentAngle = 360 / segments.length;
        const index = segments.findIndex(s => s.id === segmentId);
        return index * segmentAngle;
    };

    const spinWheel = async () => {
        if (!canSpin || isSpinning) return;

        setIsSpinning(true);
        setPrize(null);

        // Wybierz nagrodę
        const selectedPrize = selectPrize();
        const targetAngle = getSegmentAngle(selectedPrize.id);

        // Oblicz całkowity obrót (5-7 pełnych obrotów + kąt docelowy)
        const spins = 5 + Math.random() * 2; // 5-7 obrotów
        const totalRotation = rotation + (360 * spins) + (360 - targetAngle) + (360 / segments.length / 2);

        setRotation(totalRotation);

        // Poczekaj na zakończenie animacji
        setTimeout(() => {
            setIsSpinning(false);
            setPrize(selectedPrize);
            setShowPrizeModal(true);
            setCanSpin(false);

            // Zapisz datę ostatniego kręcenia
            localStorage.setItem('lastSpinDate', new Date().toDateString());

            // Wywołaj callback jeśli nagroda to monety
            if (selectedPrize.coins > 0 && onSpinComplete) {
                onSpinComplete(selectedPrize.coins);
            }
        }, 5000); // 5 sekund na animację
    };

    const resetWheel = () => {
        setShowPrizeModal(false);
    };

    // Funkcja resetująca koło (do testowania - usuń w produkcji)
    const resetDaily = () => {
        localStorage.removeItem('lastSpinDate');
        setCanSpin(true);
        setPrize(null);
    };

    return (
        <div className="fortune-wheel-container">
            <h2 className="wheel-title">🎡 Koło Fortuny</h2>
            <p className="wheel-subtitle">Zakręć raz dziennie i wygraj monety!</p>

            <div className="wheel-wrapper">
                {/* Wskaźnik (strzałka) */}
                <div className="wheel-pointer">▼</div>

                {/* Koło */}
                <div
                    className={`wheel ${isSpinning ? 'spinning' : ''}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                >
                    {segments.map((segment, index) => {
                        const angle = (360 / segments.length) * index;
                        return (
                            <div
                                key={segment.id}
                                className="wheel-segment"
                                style={{
                                    '--segment-angle': `${angle}deg`,
                                    '--segment-color': segment.color
                                }}
                            >
                                <div className="segment-content">
                                    <span className="segment-text">{segment.label}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div className="wheel-center">
                        <span className="wheel-center-text">SPIN</span>
                    </div>
                </div>
            </div>

            {/* Przycisk spin */}
            <button
                className={`spin-button ${!canSpin || isSpinning ? 'disabled' : ''}`}
                onClick={spinWheel}
                disabled={!canSpin || isSpinning}
            >
                {isSpinning ? '⏳ Kręcenie...' : !canSpin ? '🔒 Wróć jutro!' : '✨ Zakręć kołem!'}
            </button>

            {/* Przycisk resetujący (tylko do testowania) */}
            <button className="reset-button" onClick={resetDaily}>
                🔄 Reset (test)
            </button>

            {/* Modal z nagrodą */}
            {showPrizeModal && prize && (
                <div className="prize-modal-overlay" onClick={resetWheel}>
                    <div className="prize-modal" onClick={(e) => e.stopPropagation()}>
                        {prize.coins > 0 ? (
                            <>
                                <h2>🎉 Gratulacje!</h2>
                                <div className="prize-coins">
                                    <span className="coin-icon">🪙</span>
                                    <span className="coin-amount">+{prize.coins}</span>
                                </div>
                                <p>Wygrałeś {prize.coins} monet!</p>
                            </>
                        ) : (
                            <>
                                <h2>😔 Niestety...</h2>
                                <p className="empty-prize">Tym razem puste pole</p>
                                <p>Spróbuj szczęścia jutro!</p>
                            </>
                        )}
                        <button className="close-modal-button" onClick={resetWheel}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FortuneWheel;