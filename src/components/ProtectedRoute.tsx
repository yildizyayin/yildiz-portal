import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Yükleniyor...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Erişim Reddedildi</h1>
        <p>Bu sayfayı görmek için giriş yapmanız gerekir.</p>
      </div>
    );
  }

  if (requiredRoles && !requiredRoles.includes(user?.role || '')) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Yetkisiz Erişim</h1>
        <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
      </div>
    );
  }

  return <>{children}</>;
}
