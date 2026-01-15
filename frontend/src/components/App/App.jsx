import { useState, useEffect } from 'react';
import Login from '../Login/Login';
import Register from '../Register/Register';
import Dashboard from '../Dashboard/Dashboard';
import PWAInstallPrompt from '../PWAInstallPrompt/PWAInstallPrompt';
import { authAPI, tokenUtils } from "../../services/api.jsx";
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

    console.log('   Token:', token ? '✅ obecny' : '❌ brak');

    let savedUser = null;
    if (userDataStr) {
      try {
        savedUser = JSON.parse(userDataStr);
        console.log('   User:', savedUser ? `✅ ${savedUser.username} (ID: ${savedUser.id})` : '❌ brak');
      } catch (e) {
        console.error('   ❌ Błąd parsowania danych użytkownika');
        // Wyczyść uszkodzone dane
        localStorage.removeItem('user');
      }
    } else {
      console.log('   User: ❌ brak');
    }

    if (token && savedUser && savedUser.id) {
      try {
        console.log('🔄 Weryfikacja tokenu z serwerem...');
        const profile = await authAPI.getProfile();

        // Sprawdź czy ID użytkownika się zgadza
        if (profile.id === savedUser.id) {
          console.log('✅ Token ważny, użytkownik zweryfikowany');
          setUser(profile);
          setCurrentView('dashboard');
        } else {
          console.warn('⚠️ Niezgodność ID użytkownika - wylogowanie');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCurrentView('login');
        }
      } catch (error) {
        console.error('❌ Token nieważny lub błąd weryfikacji:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCurrentView('login');
      }
    } else {
      console.log('❌ Brak danych autoryzacji - przekierowanie do logowania');
      // Wyczyść ewentualne niepełne dane
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setCurrentView('login');
    }

    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    console.log('✅ Logowanie zakończone sukcesem:', userData);
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    console.log('✅ Rejestracja zakończona sukcesem:', userData);
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚪 App.jsx: Wylogowanie START');

  // Wyczyść stan
  setUser(null);
  setIsAuthenticated(false);

  // Wyczyść localStorage (zachowaj tylko migration flag)
  const keysToKeep = ['slotMachine_cleaned_v5'];
  Object.keys(localStorage).forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });

  console.log('✅ App.jsx: Wylogowanie zakończone');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
};

  const switchToRegister = () => {
    setCurrentView('register');
  };

  const switchToLogin = () => {
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
