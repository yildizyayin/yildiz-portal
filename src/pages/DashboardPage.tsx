import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import styles from '../styles/dashboard.module.css';

export function DashboardPage() {
  const { user, token } = useAuth();
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const url = user?.role === 'KURUM' 
          ? `/api/dashboard/institution/${user.institution_id}`
          : '/api/dashboard/kpis';

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setKpis(data);
        }
      } catch (error) {
        console.error('Failed to fetch KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchKPIs();
    }
  }, [token, user?.id]);

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <div className={styles.layout}>
      <Navbar />
      <div className={styles.main}>
        <Sidebar userRole={user?.role} />
        <div className={styles.content}>
          <h1>Dashboard</h1>
          
          {user?.role !== 'KURUM' ? (
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Toplam Siparişler</h3>
                <p className={styles.value}>{kpis?.orders?.total || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Bekleyen Siparişler</h3>
                <p className={styles.value}>{kpis?.orders?.pending || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Toplam Gelir</h3>
                <p className={styles.value}>₺{(kpis?.revenue?.total || 0).toLocaleString('tr-TR')}</p>
              </div>
              <div className={styles.card}>
                <h3>Aktif Satış Fırsatları</h3>
                <p className={styles.value}>{kpis?.sales?.active_opportunities || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Bekleyen Teslimatlar</h3>
                <p className={styles.value}>{kpis?.deliveries?.pending || 0}</p>
              </div>
            </div>
          ) : (
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Siparişler</h3>
                <p className={styles.value}>{kpis?.orders || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Planlanan Denemeler</h3>
                <p className={styles.value}>{kpis?.planned_exams || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Başlayan Denemeler</h3>
                <p className={styles.value}>{kpis?.enrolled_exams || 0}</p>
              </div>
              <div className={styles.card}>
                <h3>Bekleyen Teslimatlar</h3>
                <p className={styles.value}>{kpis?.pending_deliveries || 0}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
