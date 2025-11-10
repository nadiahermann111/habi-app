import React, { useState, useCallback, useRef } from 'react';
import './HabiSection.css';

// ✅ STATYCZNE IMPORTY WSZYSTKICH OBRAZKÓW
import HabiAdultHappy from '../HabiClothes/HabiAdultHappy.png';
import HabiPiercingHappy from '../HabiClothes/HabiPiercingHappy.png';
import HabiBowHappy from '../HabiClothes/HabiBowHappy.png';
import HabiLeopardHappy from '../HabiClothes/HabiLeopardHappy.png';
import HabiFlowerHappy from '../HabiClothes/HabiFlowerHappy.png';
import HabiTattooHappy from '../HabiClothes/HabiTattooHappy.png';
import HabiLoveHappy from '../HabiClothes/HabiLoveHappy.png';
import HabiBananaHappy from '../HabiClothes/HabiBananaHappy.png';
import HabiJeansHappy from '../HabiClothes/HabiJeansHappy.png';
import HabiShrekHappy from '../HabiClothes/HabiShrekHappy.png';
import HabiPlayboyHappy from '../HabiClothes/HabiPlayboyHappy.png';

// 🔊 IMPORTY DŹWIĘKÓW MOTYWACYJNYCH
import DzialaszLepiejSound from '../Sounds/DzialaszLepiej.mp3';
import DzisRobimySound from '../Sounds/DzisRobimy.mp3';
import JestemTuSound from '../Sounds/JestemTu.mp3';
import JestesNaSound from '../Sounds/JestesNa.mp3';
import KazdyDzienSound from '../Sounds/KazdyDzien.mp3';
import KazdyKrokSound from '../Sounds/KazdyKrok.mp3';
import KazdyMalySound from '../Sounds/KazdyMaly.mp3';
import KazdySukcesSound from '../Sounds/KazdySukces.mp3';
import MalymiKrokamiSound from '../Sounds/MalymiKrokami.mp3';
import RazemJestesmySound from '../Sounds/RazemJestesmy.mp3';
import TwojaDeteminacjaSound from '../Sounds/TwojaDeterminacja.mp3';
import TwojaEnergiaSound from '../Sounds/TwojaEnergia.mp3';
import TwojeNawykiSound from '../Sounds/TwojeNawyki.mp3';
import TwojEntuzjazmSound from '../Sounds/TwojEntuzjazm.mp3';
import TwojProgresSound from '../Sounds/TwojProgres.mp3';
import TwojWysilekSound from '../Sounds/TwojWysilek.mp3';
import WspanialeSobieSound from '../Sounds/WspanialeSobie.mp3';
import WspolnieZbudujemySound from '../Sounds/WspolnieZbudujemy.mp3';
import KazdegoSound from '../Sounds/KazdegoDnia.mp3';
import JestesMistrzem from '../Sounds/JestesMistrzem.mp3';

import FoodControl from '../FoodControl/FoodControl';

const HabiSection = ({ currentClothing }) => {
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const timeoutRef = useRef(null);
  const lastClickTime = useRef(0);

  // ✅ MAPA OBRAZKÓW
  const clothingImages = {
    1: HabiPiercingHappy,
    2: HabiBowHappy,
    3: HabiLeopardHappy,
    4: HabiFlowerHappy,
    5: HabiTattooHappy,
    6: HabiLoveHappy,
    7: HabiBananaHappy,
    8: HabiJeansHappy,
    9: HabiShrekHappy,
    10: HabiPlayboyHappy
  };

  // ✅ FUNKCJA ZWRACAJĄCA OBRAZEK
  const getHabiImage = () => {
    if (!currentClothing) return HabiAdultHappy;
    return clothingImages[currentClothing] || HabiAdultHappy;
  };

  // 🔊 TABLICA WIADOMOŚCI Z PRZYPISANYMI DŹWIĘKAMI
  const motivationalMessages = [
    { text: "Każdy dzień to nowy początek! 🌅", sound: KazdyDzienSound },
    { text: "Małymi krokami osiągniesz wielkie rzeczy! 👣", sound: MalymiKrokamiSound },
    { text: "Twoja determinacja mnie inspiruje! ✨", sound: TwojaDeteminacjaSound },
    { text: "Dziś robimy postępy! 🚀", sound: DzisRobimySound },
    { text: "Wspaniale sobie radzisz! 🌟", sound: WspanialeSobieSound },
    { text: "Każdy sukces zaczyna się od pierwszego kroku! 👟", sound: KazdySukcesSound },
    { text: "Twoje nawyki budują lepsze jutro! 🌈", sound: TwojeNawykiSound },
    { text: "Jestem tu, żeby Cię wspierać! 🤗", sound: JestemTuSound },
    { text: "Każdy mały krok się liczy! 🦶", sound: KazdyMalySound },
    { text: "Jesteś na właściwej drodze! 🛤️", sound: JestesNaSound },
    { text: "Twój wysiłek się opłaca! 💎", sound: TwojWysilekSound },
    { text: "Każdego dnia jesteś lepszy! 📊", sound: KazdegoSound },
    { text: "Twój progres jest widoczny! 👀", sound: TwojProgresSound },
    { text: "Twoja energia mnie motywuje! ⚡", sound: TwojaEnergiaSound },
    { text: "Wspólnie zbudujemy lepsze jutro! 🏗️", sound: WspolnieZbudujemySound },
    { text: "Każdy krok przybliża Cię do celu! 🎪", sound: KazdyKrokSound },
    { text: "Razem jesteśmy niezwyciężeni! 🛡️", sound: RazemJestesmySound },
    { text: "Twój entuzjazm jest zaraźliwy! 😄", sound: TwojEntuzjazmSound },
    { text: "Jesteś mistrzem nawyków! 🏅", sound: JestesMistrzem },
    { text: "Działasz lepiej niż poranna kawa ☕💪", sound: DzialaszLepiejSound }
  ];

  // 🔊 FUNKCJA DO ODTWARZANIA DŹWIĘKÓW
  const playSound = (soundFile) => {
    try {
      if (soundFile) {
        const audio = new Audio(soundFile);
        audio.volume = 0.6; // głośność 60%
        audio.play().catch(err => console.log('🔇 Nie udało się odtworzyć dźwięku:', err));
      }
    } catch (error) {
      console.log('🔇 Błąd odtwarzania:', error);
    }
  };

  const handleHabiClick = useCallback(() => {
    const now = Date.now();

    if (now - lastClickTime.current < 500) {
      return;
    }

    lastClickTime.current = now;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setShowMessage(false);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      const selectedMessage = motivationalMessages[randomIndex];

      // ✅ USTAW TEKST WIADOMOŚCI
      setCurrentMessage(selectedMessage.text);

      // 🔊 ODTWÓRZ DŹWIĘK
      playSound(selectedMessage.sound);

      setShowMessage(true);

      timeoutRef.current = setTimeout(() => {
        setShowMessage(false);
      }, 2500);
    }, 50);
  }, [motivationalMessages]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="habi-section">
      <div className="habi-card">
        <h3>Twoja małpka Habi</h3>
        <div className="habi-content">
          <div className="habi-status">
            <div className="habi-avatar" onClick={handleHabiClick}>
              <img src={getHabiImage()} alt="Habi Happy Adult" />

              {showMessage && (
                <div className="habi-message-container">
                  <div className="habi-heart">❤️</div>
                  <div className="habi-message">{currentMessage}</div>
                </div>
              )}
            </div>
          </div>
          <FoodControl />
        </div>
      </div>
    </div>
  );
};

export default HabiSection;