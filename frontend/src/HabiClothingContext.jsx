import React, { createContext, useState, useContext, useEffect } from 'react';

// Import wszystkich obrazków Habi
import HabiHappyAdult from './components/HabiClothes/HabiAdultHappy.png';
import HabiBananaHappy from './components/HabiClothes/HabiBananaHappy.png';
import HabiBowHappy from './components/HabiClothes/HabiBowHappy.png';
import HabiFlowerHappy from './components/HabiClothes/HabiFlowerHappy.png';
import HabiJeansHappy from './components/HabiClothes/HabiJeansHappy.png';
import HabiLeopardHappy from './components/HabiClothes/HabiLeopardHappy.png';
import HabiLoveHappy from './components/HabiClothes/HabiLoveHappy.png';
import HabiPiercingHappy from './components/HabiClothes/HabiPiercingHappy.png';
import HabiPlayboyHappy from './components/HabiClothes/HabiPlayboyHappy.png';
import HabiShrekHappy from './components/HabiClothes/HabiShrekHappy.png';
import HabiTattooHappy from './components/HabiClothes/HabiTattooHappy.png';

const HabiClothingContext = createContext();

// Mapowanie ID ubrań na odpowiednie obrazki
const clothingImageMap = {
  1: HabiPiercingHappy,     // Kolczyki
  2: HabiBowHappy,          // Kokardka
  3: HabiLeopardHappy,      // Opaska w Panterke
  4: HabiFlowerHappy,       // Kwiatek Hibiskus
  5: HabiTattooHappy,       // Tatuaże
  6: HabiLoveHappy,         // Koszulka i❤️ Habi
  7: HabiBananaHappy,       // Koszulka Banan
  8: HabiJeansHappy,        // Ogrodniczki
  9: HabiShrekHappy,        // Tajemnicza opcja
  10: HabiPlayboyHappy      // Strój Playboy
};

export const HabiClothingProvider = ({ children }) => {
  // Stan przechowujący aktualnie założone ubranie (ID)
  const [currentClothing, setCurrentClothing] = useState(null);

  // Obrazek Habi do wyświetlenia
  const [habiImage, setHabiImage] = useState(HabiHappyAdult);

  // Wczytaj zapisane ubranie z localStorage przy montowaniu
  useEffect(() => {
    const savedClothing = localStorage.getItem('currentHabiClothing');
    if (savedClothing) {
      const clothingId = parseInt(savedClothing);
      setCurrentClothing(clothingId);
      updateHabiImage(clothingId);
    }
  }, []);

  // Funkcja aktualizująca obrazek Habi
  const updateHabiImage = (clothingId) => {
    if (clothingId && clothingImageMap[clothingId]) {
      setHabiImage(clothingImageMap[clothingId]);
    } else {
      setHabiImage(HabiHappyAdult);
    }
  };

  // Funkcja zmieniająca ubranie Habi
  const changeClothing = (clothingId) => {
    setCurrentClothing(clothingId);
    updateHabiImage(clothingId);

    // Zapisz do localStorage
    if (clothingId) {
      localStorage.setItem('currentHabiClothing', clothingId.toString());
    } else {
      localStorage.removeItem('currentHabiClothing');
    }

    // Wyślij globalny event o zmianie ubrania
    window.dispatchEvent(new CustomEvent('clothingChanged', {
      detail: { clothingId }
    }));
  };

  // Funkcja zdejmująca ubranie (powrót do domyślnego)
  const removeClothing = () => {
    changeClothing(null);
  };

  const value = {
    currentClothing,
    habiImage,
    changeClothing,
    removeClothing,
    clothingImageMap
  };

  return (
    <HabiClothingContext.Provider value={value}>
      {children}
    </HabiClothingContext.Provider>
  );
};

// Hook do używania contextu
export const useHabiClothing = () => {
  const context = useContext(HabiClothingContext);
  if (!context) {
    throw new Error('useHabiClothing must be used within HabiClothingProvider');
  }
  return context;
};

export default HabiClothingContext;