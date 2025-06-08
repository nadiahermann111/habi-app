import { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  // Stan przechowujący odroczone zdarzenie instalacji PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  // Stan kontrolujący wyświetlanie prompt'a do instalacji
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Handler dla zdarzenia beforeinstallprompt (przed wyświetleniem prompt'a instalacji)
    const handleBeforeInstallPrompt = (e) => {
      // Zapobieganie wyświetleniu domyślnego mini-infobara na urządzeniach mobilnych
      e.preventDefault();
      // Zapisanie zdarzenia aby móc je użyć później
      setDeferredPrompt(e);
      // Wyświetlenie własnego prompt'a do instalacji
      setShowInstallPrompt(true);
    };

    // Handler dla zdarzenia appinstalled (po zainstalowaniu aplikacji)
    const handleAppInstalled = () => {
      console.log('Habi została zainstalowana');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    // Dodanie nasłuchiwaczy na zdarzenia PWA
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup - usunięcie nasłuchiwaczy przy odmontowaniu komponentu
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Funkcja obsługująca kliknięcie przycisku instalacji
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Wyświetlenie natywnego prompt'a instalacji
    deferredPrompt.prompt();

    // Oczekiwanie na odpowiedź użytkownika
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Wyczyszczenie odroczonego prompt'a
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Funkcja obsługująca odrzucenie prompt'a instalacji
  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Ukrycie prompt'a na czas tej sesji
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Nie wyświetlaj jeśli prompt został już odrzucony w tej sesji
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  // Nie wyświetlaj jeśli prompt nie powinien być pokazany
  if (!showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div>
        <strong>🐵 Zainstaluj Habi!</strong>
        <p>Dodaj aplikację do ekranu głównego dla lepszego doświadczenia</p>
      </div>
      <div>
        {/* Przycisk instalacji aplikacji */}
        <button onClick={handleInstallClick}>
          Zainstaluj
        </button>
        {/* Przycisk odrzucenia prompt'a */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            color: 'inherit',
            marginLeft: '8px'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;