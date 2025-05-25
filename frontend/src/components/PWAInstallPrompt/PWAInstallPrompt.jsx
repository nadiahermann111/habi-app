import { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show the install prompt
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('Habi została zainstalowana');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Hide for this session
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already dismissed this session
  if (localStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  if (!showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div>
        <strong>🐵 Zainstaluj Habi!</strong>
        <p>Dodaj aplikację do ekranu głównego dla lepszego doświadczenia</p>
      </div>
      <div>
        <button onClick={handleInstallClick}>
          Zainstaluj
        </button>
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