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
    if (tokenUtils.getToken()) {
      try {
        const profile = await authAPI.getProfile();
        setUser(profile);
        setCurrentView('dashboard');
      } catch (error) {
        tokenUtils.removeToken();
        setCurrentView('login');
      }
    } else {
      setCurrentView('login');
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

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
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