import React, { useState } from 'react';
import './HabiSection.css';
import HabiHappyAdult from './HabiAdultHappy.png';
import FoodControl from '../FoodControl/FoodControl';

const HabiSection = () => {
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');

  // Tablica motywacyjnych wiadomości
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
    "Razem osiągniemy wszystko! 🤝"
  ];

  const handleHabiClick = () => {
    // Losuj wiadomość
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    setCurrentMessage(motivationalMessages[randomIndex]);

    // Pokaż wiadomość
    setShowMessage(true);

    // Ukryj wiadomość po 3 sekundach
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  return (
    <div className="habi-section">
      <div className="habi-card">
        <h3>Twoja małpka Habi</h3>
        <div className="habi-content">
          <div className="habi-status">
            <div className="habi-avatar" onClick={handleHabiClick}>
              <img src={HabiHappyAdult} alt="Habi Happy Adult" />

              {/* Animowane serduszko i wiadomość */}
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