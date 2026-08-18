import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/navbar.module.css';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <h1>Yıldız Deneme Platformu</h1>
        </div>
        {isAuthenticated && (
          <div className={styles.menu}>
            <span className={styles.user}>{user?.full_name}</span>
            <span className={styles.role}>({user?.role})</span>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Çıkış Yap
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
