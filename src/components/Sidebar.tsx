import React from 'react';
import styles from '../styles/sidebar.module.css';

interface SidebarLink {
  href: string;
  label: string;
  role?: string[];
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { href: '/', label: 'Dashboard' },
  { href: '/exams', label: 'Denemeler', role: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/publishers', label: 'Yayınevleri', role: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/institutions', label: 'Kurumlar', role: ['SUPER_ADMIN', 'ADMIN', 'PERSONEL'] },
  { href: '/orders', label: 'Siparişler', role: ['SUPER_ADMIN', 'ADMIN', 'PERSONEL', 'KURUM'] },
  { href: '/sales', label: 'Satış Fırsatları', role: ['SUPER_ADMIN', 'ADMIN', 'PERSONEL'] },
  { href: '/deliveries', label: 'Teslimatlar', role: ['SUPER_ADMIN', 'ADMIN', 'OPERASYON'] },
  { href: '/settings', label: 'Ayarlar', role: ['SUPER_ADMIN'] },
];

export function Sidebar({ userRole }: { userRole?: string }) {
  const getVisibleLinks = () => {
    if (!userRole) return [];
    return SIDEBAR_LINKS.filter((link) => !link.role || link.role.includes(userRole));
  };

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {getVisibleLinks().map((link) => (
          <a key={link.href} href={link.href} className={styles.link}>
            {link.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
