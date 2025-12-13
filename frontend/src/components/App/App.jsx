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
    const token = tokenUtils.getToken();

    if (!token) {
      // ✅ Brak tokenu - spróbuj odzyskać sesję z cookies
      console.log('Brak tokenu - próba odzyskania sesji...');

      try {
        const restored = await authAPI.refreshSession();
        if (restored) {
          console.log('✅ Sesja odzyskana z cookies!');
          // Pobierz profil z nowym tokenem
          const profile = await authAPI.getProfile();
          setUser(profile);
          setCurrentView('dashboard');
        } else {
          console.log('❌ Brak aktywnej sesji');
          setCurrentView('login');
        }
      } catch (error) {
        console.error('Błąd odzyskiwania sesji:', error);
        setCurrentView('login');
      }
    } else {
      // Token istnieje - spróbuj pobrać profil
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
        setCurrentView('dashboard');
      } catch (error) {
        console.log('Token nieważny, próba odświeżenia...');

        // Token nieważny - spróbuj odświeżyć z cookies
        try {
          const restored = await authAPI.refreshSession();
          if (restored) {
            const profile = await authAPI.getProfile();
            setUser(profile);
            setCurrentView('dashboard');
          } else {
            tokenUtils.removeToken();
            setCurrentView('login');
          }
        } catch (refreshError) {
          tokenUtils.removeToken();
          setCurrentView('login');
        }
      }
    }

    setLoading(false);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    } finally {
      tokenUtils.removeToken();
      setUser(null);
      setCurrentView('login');
    }
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