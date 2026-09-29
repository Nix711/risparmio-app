"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  expenses: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  goals: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  statistics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  add: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
};

const navItems = [
  { href: "/", icon: icons.dashboard, label: "Home" },
  { href: "/expenses", icon: icons.expenses, label: "Trans." },
  { href: "/goals", icon: icons.goals, label: "Obiettivi" },
  { href: "/statistics", icon: icons.statistics, label: "Stats" },
  { href: "/profile", icon: icons.profile, label: "Profilo" },
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "U";
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>💰</span>
          <div className={styles.logoTextBlock}>
            <h1 className={styles.logoText}>Risparmio</h1>
            <p className={styles.logoSubtext}>finanze personali</p>
          </div>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {getInitials(user.name, user.email)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className={styles.userName}>{user.name || "Utente"}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={styles.logoutButton}
          >
            Esci
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <div className={styles.bottomNavPill}>
          <Link
            href="/"
            className={`${styles.bottomNavItem} ${pathname === "/" ? styles.bottomNavItemActive : ""}`}
          >
            {icons.dashboard}
            <span className={styles.bottomNavLabel}>Home</span>
          </Link>

          <Link
            href="/expenses"
            className={`${styles.bottomNavItem} ${pathname === "/expenses" ? styles.bottomNavItemActive : ""}`}
          >
            {icons.expenses}
            <span className={styles.bottomNavLabel}>Trans.</span>
          </Link>

          <div className={styles.fabWrapper}>
            <Link href="/expenses?add=true" className={styles.addButton}>
              {icons.add}
            </Link>
            <span className={styles.fabLabel}>Aggiungi</span>
          </div>

          <Link
            href="/goals"
            className={`${styles.bottomNavItem} ${pathname === "/goals" || pathname.startsWith("/goals/") ? styles.bottomNavItemActive : ""}`}
          >
            {icons.goals}
            <span className={styles.bottomNavLabel}>Obiettivi</span>
          </Link>

          <Link
            href="/profile"
            className={`${styles.bottomNavItem} ${pathname === "/profile" ? styles.bottomNavItemActive : ""}`}
          >
            {icons.profile}
            <span className={styles.bottomNavLabel}>Profilo</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
