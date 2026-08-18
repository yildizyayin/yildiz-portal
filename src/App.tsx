import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import './styles/globals.css';

function App() {
  const isLoggedIn = !!localStorage.getItem('auth');

  return (
    <AuthProvider>
      {!isLoggedIn ? (
        <LoginPage />
      ) : (
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}

export default App;
