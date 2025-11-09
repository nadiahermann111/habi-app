import React, { useState, useCallback, useRef } from 'react';
import './HabiSection.css';
import HabiHappyAdult from './HabiAdultHappy.png';
import FoodControl from '../FoodControl/FoodControl';

const HabiSection = () => {
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const timeoutRef = useRef(null);
  const lastClickTime = useRef(0);

  // Rozszerzona lista motywacyjnych wiadomości
  const motivationalMessages = [
    "Świetnie Ci idzie! 💪",
    "Jesteś niesamowity! ⭐",
    "Dumny jestem z Ciebie! 🎉",
    "Każdy dzień to nowy początek! 🌅",
    "Wierzę w Ciebie! 💙",
    "Małymi krokami osiągniesz wielkie rzeczy! 👣",
    "Twoja determinacja mnie inspiruje! ✨",
    "Jesteś silniejszy niż myślisz! 💪",
    "Dziś robimy postępy! 🚀",
    "Wspaniale sobie radzisz! 🌟",
    "Jestem z Ciebie bardzo dumny! 🏆",
    "Nie poddawaj się - jesteś blisko celu! 🎯",
    "Każdy sukces zaczyna się od pierwszego kroku! 👟",
    "Twoja wytrwałość przynosi owoce! 🍎",
    "Robisz niesamowite postępy! 📈",
    "Pamiętaj - jesteś championem! 🥇",
    "Twoje nawyki budują lepsze jutro! 🌈",
    "Jestem tu, żeby Cię wspierać! 🤗",
    "Wow, jakie osiągnięcia! 🎊",
    "Razem osiągniemy wszystko! 🤝",
    "Jestem z Ciebie mega dumny! 🌟",
    "Kontynuuj świetną robotę! 👏",
    "Twoja siła woli jest niesamowita! 🔥",
    "Każdy mały krok się liczy! 🦶",
    "Jesteś na właściwej drodze! 🛤️",
    "Twój wysiłek się opłaca! 💎",
    "Nigdy się nie poddawaj! 💯",
    "Jesteś prawdziwym wojownikiem! ⚔️",
    "Twoja konsekwencja mnie zachwyca! 🌺",
    "Trzymaj tak dalej! 🎯",
    "Każdy dzień jesteś lepszy! 📊",
    "Twoje zaangażowanie jest inspirujące! 🎨",
    "Wierzę w Twój sukces! 🌠",
    "Jesteś na dobrej drodze! 🛣️",
    "Twój progres jest widoczny! 👀",
    "Gratulacje postępów! 🥳",
    "Jestem Twoim największym fanem! 🎭",
    "Twoja energia mnie motywuje! ⚡",
    "Wspólnie zbudujemy lepsze jutro! 🏗️",
    "Jesteś moim bohaterem! 🦸",
    "Twoja determinacja jest zaraźliwa! 😊",
    "Każdy krok przybliża Cię do celu! 🎪",
    "Twoja siła charakteru zachwyca! 💫",
    "Jestem dumną małpką! 🐵",
    "Razem jesteśmy niezwyciężeni! 🛡️",
    "Twój entuzjazm jest zaraźliwy! 😄",
    "Jesteś mistrzem nawykow! 🏅",
    "Każdy dzień to nowa szansa! 🌄",
    "Twój postęp mnie cieszy! 😊",
    "Jesteś cudowny! 🌸"
  ];

  // Funkcja obsługująca kliknięcie z debouncing
  const handleHabiClick = useCallback(() => {
    const now = Date.now();

    // Debouncing - zapobiega zbyt częstym kliknięciom (500ms)
    if (now - lastClickTime.current < 500) {
      return;
    }

    lastClickTime.current = now;

    // Wyczyść poprzedni timeout jeśli istnieje
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Ukryj poprzednią wiadomość natychmiast
    setShowMessage(false);

    // Po krótkiej przerwie pokaż nową wiadomość
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
      setCurrentMessage(motivationalMessages[randomIndex]);
      setShowMessage(true);

      // Ustaw timeout do ukrycia wiadomości
      timeoutRef.current = setTimeout(() => {
        setShowMessage(false);
      }, 2500);
    }, 50);
  }, [motivationalMessages]);

  // Cleanup timeout przy unmount
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
              <img src={HabiHappyAdult} alt="Habi Happy Adult" />

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