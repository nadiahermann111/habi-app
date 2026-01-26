import { useState, useEffect } from 'react';
import Login from '../Login/Login';
import Register from '../Register/Register';
import Dashboard from '../Dashboard/Dashboard';
import PWAInstallPrompt from '../PWAInstallPrompt/PWAInstallPrompt';
import { authAPI } from "../../services/api.jsx";
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔍 Sprawdzanie stanu autoryzacji...');

    // Pobierz dane z localStorage
    const token = localStorage.getItem('token');
    const userDataStr = localStorage.getItem('user');

    console.log('   Token:', token ? ' obecny' : ' brak');

    let savedUser = null;
    if (userDataStr) {
      try {
        savedUser = JSON.parse(userDataStr);
        console.log('   User:', savedUser ? ` ${savedUser.username} (ID: ${savedUser.id})` : '❌ brak');
      } catch (e) {
        console.error('   Błąd parsowania danych użytkownika');
        // Wyczyść uszkodzone dane
        localStorage.removeItem('user');
      }
    } else {
      console.log('   User:  brak');
    }

    if (token && savedUser && savedUser.id) {
      try {
        console.log('Weryfikacja tokenu z serwerem...');
        const profile = await authAPI.getProfile();

        // Sprawdź czy ID użytkownika się zgadza
        if (profile.id === savedUser.id) {
          console.log('Token ważny, użytkownik zweryfikowany');
          setUser(profile);
          setCurrentView('dashboard');
        } else {
          console.warn('Niezgodność ID użytkownika - wylogowanie');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setCurrentView('login');
        }
      } catch (error) {
        console.error('Token nieważny lub błąd weryfikacji:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setCurrentView('login');
      }
    } else {
      console.log('Brak danych autoryzacji - przekierowanie do logowania');
      // Wyczyść ewentualne niepełne dane
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setCurrentView('login');
    }

    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    console.log('App.jsx: Logowanie zakończone sukcesem:', userData);
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    console.log('App.jsx: Rejestracja zakończona sukcesem:', userData);
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    console.log('App.jsx: WYLOGOWANIE START');

    // 1. Wyczyść stan użytkownika
    console.log('Resetowanie stanu użytkownika...');
    setUser(null);

    // 2. Wyczyść localStorage (zachowaj tylko migration flag)
    console.log('Czyszczenie localStorage...');
    const keysToKeep = ['slotMachine_cleaned_v5'];
    const removedKeys = [];

    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        removedKeys.push(key);
      }
    });

    console.log(`   ✓ Usunięto ${removedKeys.length} kluczy:`, removedKeys);

    // 3. Przekieruj do ekranu logowania
    console.log('Przekierowanie do ekranu logowania...');
    setCurrentView('login');

    console.log('App.jsx: WYLOGOWANIE ZAKOŃCZONE');
  };

  const switchToRegister = () => {
    console.log('Przełączanie na rejestrację');
    setCurrentView('register');
  };

  const switchToLogin = () => {
    console.log('Przełączanie na logowanie');
    setCurrentView('login');
  };

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
      <PWAInstallPrompt />

      {currentView === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          switchToRegister={switchToRegister}
        />
      )}

      {currentView === 'register' && (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          switchToLogin={switchToLogin}
        />
      )}

      {currentView === 'dashboard' && user && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App;