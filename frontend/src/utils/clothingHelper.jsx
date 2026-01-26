
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

export const getClothingImage = (clothingId) => {
  if (!clothingId) {
    return 'HabiAdultHappy.png'; // Domyślny obrazek
  }
  return clothingImageMap[clothingId] || 'HabiAdultHappy.png';
};

const getUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.user_id || payload.sub || payload.id;
  } catch (error) {
    console.error(' Błąd odczytu user_id z tokenu:', error);
    return null;
  }
};

export const clothingStorage = {
  save: (clothingId) => {
    const userId = getUserIdFromToken();

    if (!userId) {
      console.warn('Brak user_id - nie można zapisać ubrania');
      return;
    }

    const key = `currentHabiClothing_${userId}`;

    if (clothingId) {
      localStorage.setItem(key, clothingId.toString());
      console.log(`Zapisano ubranie dla użytkownika ${userId}:`, clothingId);
    } else {
      localStorage.removeItem(key);
      console.log(`Usunięto ubranie dla użytkownika ${userId}`);
    }
  },

  load: () => {
    const userId = getUserIdFromToken();

    if (!userId) {
      console.warn('Brak user_id - nie można załadować ubrania');
      return null;
    }

    const key = `currentHabiClothing_${userId}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      console.log(`Załadowano ubranie dla użytkownika ${userId}:`, saved);
    }

    return saved ? parseInt(saved) : null;
  },

  clear: () => {
    const userId = getUserIdFromToken();

    if (!userId) {
      console.warn('Brak user_id - czyszczenie wszystkich kluczy');
      // Wyczyść wszystkie możliwe klucze
      Object.keys(localStorage)
        .filter(key => key.startsWith('currentHabiClothing') || key.startsWith('ownedClothes'))
        .forEach(key => localStorage.removeItem(key));
      return;
    }

    const key = `currentHabiClothing_${userId}`;
    const ownedKey = `ownedClothes_${userId}`;

    localStorage.removeItem(key);
    localStorage.removeItem(ownedKey);
    // Usuń też stare klucze bez user_id (legacy)
    localStorage.removeItem('currentClothing');
    localStorage.removeItem('ownedClothes');

    console.log(`🗑Wyczyszczono ubrania dla użytkownika ${userId}`);
  },

  clearAll: () => {
    Object.keys(localStorage)
      .filter(key =>
        key.startsWith('currentHabiClothing') ||
        key.startsWith('ownedClothes') ||
        key === 'currentClothing'
      )
      .forEach(key => localStorage.removeItem(key));
    console.log(' Wyczyszczono wszystkie ubrania');
  }
};

export const clearClothingOnLogout = () => {
  clothingStorage.clear();
  console.log('Wyczyszczono dane ubrań przy wylogowaniu');
};