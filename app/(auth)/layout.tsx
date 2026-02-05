import { ReactNode } from "react";
import styles from "./layout.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>💰</div>
          <h1 className={styles.logoText}>BalanceBook</h1>
          <p className={styles.logoSubtext}>controllo delle finanze</p>
        </div>
        {children}
      </div>
    </div>
  );
}
