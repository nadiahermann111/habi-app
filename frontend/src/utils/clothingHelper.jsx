// src/utils/clothingHelper.jsx

// Mapowanie ID ubrań na nazwy plików PNG
export const clothingImageMap = {
  1: 'HabiPiercingHappy.png',
  2: 'HabiBowHappy.png',
  3: 'HabiLeopardHappy.png',
  4: 'HabiFlowerHappy.png',
  5: 'HabiTattooHappy.png',
  6: 'HabiLoveHappy.png',
  7: 'HabiBananaHappy.png',
  8: 'HabiJeansHappy.png',
  9: 'HabiShrekHappy.png',
  10: 'HabiPlayboyHappy.png'
};

// Funkcja zwracająca nazwę pliku obrazka na podstawie ID
export const getClothingImage = (clothingId) => {
  if (!clothingId) {
    return 'HabiAdultHappy.png'; // Domyślny obrazek
  }
  return clothingImageMap[clothingId] || 'HabiAdultHappy.png';
};

// Funkcje do zarządzania localStorage
export const clothingStorage = {
  save: (clothingId) => {
    if (clothingId) {
      localStorage.setItem('currentHabiClothing', clothingId.toString());
      console.log('💾 Zapisano ubranie do localStorage:', clothingId);
    } else {
      localStorage.removeItem('currentHabiClothing');
    }
  },

  load: () => {
    const saved = localStorage.getItem('currentHabiClothing');
    return saved ? parseInt(saved) : null;
  },

  clear: () => {
    localStorage.removeItem('currentHabiClothing');
  }
};