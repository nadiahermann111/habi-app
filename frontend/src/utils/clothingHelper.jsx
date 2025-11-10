// src/utils/clothingHelper.js

// Mapowanie ID ubrań na nazwy plików PNG
export const clothingImageMap = {
  1: 'HabiPiercingHappy.png',
  2: 'HabiBowHappy.png',
  3: 'HabiLeopardHappy.png',
  4: 'HabiFlowerHappy.png',
  5: 'HabiTattooHappy.png',
  6: 'HabiLoveHappy.png',
  7: 'HabiBananaHappy.png',
  8: 'HabiJeansHappy.png',      // Ogrodniczki
  9: 'HabiShrekHappy.png',       // Tajemnicza opcja
  10: 'HabiPlayboyHappy.png'
};

// Funkcja zwracająca ścieżkę do obrazka na podstawie ID
export const getClothingImage = (clothingId) => {
  if (!clothingId) {
    return 'HabiAdultHappy.png'; // Domyślny obrazek
  }
  return clothingImageMap[clothingId] || 'HabiAdultHappy.png';
};

// Funkcje do zarządzania localStorage
export const clothingStorage = {
  // Zapisz obecnie założone ubranie
  save: (clothingId) => {
    if (clothingId) {
      localStorage.setItem('currentHabiClothing', clothingId.toString());
    } else {
      localStorage.removeItem('currentHabiClothing');
    }
  },

  // Wczytaj obecnie założone ubranie
  load: () => {
    const saved = localStorage.getItem('currentHabiClothing');
    return saved ? parseInt(saved) : null;
  },

  // Usuń zapisane ubranie
  clear: () => {
    localStorage.removeItem('currentHabiClothing');
  }
};