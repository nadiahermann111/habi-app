import { useState, useEffect } from 'react';
import Login from '../Login/Login';
import Register from '../Register/Register';
import Dashboard from '../Dashboard/Dashboard';
import PWAInstallPrompt from '../PWAInstallPrompt/PWAInstallPrompt';
import { authAPI, tokenUtils } from "../../services/api.jsx";
import './App.css';

function App() {
  // Stan przechowujący aktualny widok aplikacji
  const [currentView, setCurrentView] = useState('login');
  // Stan przechowujący dane zalogowanego użytkownika
  const [user, setUser] = useState(null);
  // Stan informujący o trwającym ładowaniu aplikacji
  const [loading, setLoading] = useState(true);

  // Sprawdzenie stanu autoryzacji przy pierwszym uruchomieniu aplikacji
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Funkcja sprawdzająca czy użytkownik jest zalogowany
  const checkAuthStatus = async () => {
    // Sprawdzenie czy token autoryzacji istnieje w pamięci
    if (tokenUtils.getToken()) {
      try {
        // Próba pobrania profilu użytkownika z serwera
        const profile = await authAPI.getProfile();
        setUser(profile);
        setCurrentView('dashboard');
      } catch (error) {
        // Token jest nieprawidłowy lub wygasł - wylogowanie użytkownika
        tokenUtils.removeToken();
        setCurrentView('login');
      }
    } else {
      // Brak tokena - przekierowanie do ekranu logowania
      setCurrentView('login');
    }
    // Zakończenie ładowania aplikacji
    setLoading(false);
  };

  // Obsługa pomyślnego logowania
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  // Obsługa pomyślnej rejestracji
  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  // Obsługa wylogowania użytkownika
  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
  };

  // Przełączenie widoku na ekran rejestracji
  const switchToRegister = () => {
    setCurrentView('register');
  };

  // Przełączenie widoku na ekran logowania
  const switchToLogin = () => {
    setCurrentView('login');
  };

  // Wyświetlenie ekranu ładowania podczas inicjalizacji aplikacji
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🐵</div>
        <p>Ładowanie Habi...</p>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Komponent zachęcający do instalacji aplikacji jako PWA */}
      <PWAInstallPrompt />

      {/* Renderowanie ekranu logowania */}
      {currentView === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          switchToRegister={switchToRegister}
        />
      )}

      {/* Renderowanie ekranu rejestracji */}
      {currentView === 'register' && (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          switchToLogin={switchToLogin}
        />
      )}

      {/* Renderowanie głównego dashboardu aplikacji */}
      {currentView === 'dashboard' && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;