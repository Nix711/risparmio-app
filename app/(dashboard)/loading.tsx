import styles from "./loading.module.css";

export default function DashboardLoading() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>💰</div>
        <div className={styles.dots}>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
    </div>
  );
}
