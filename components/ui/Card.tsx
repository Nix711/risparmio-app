import { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`${styles.card} ${className}`}>{children}</div>;
}

interface CardHeaderProps {
  title: string;
  description?: string;
}

export function CardHeader({ title, description }: CardHeaderProps) {
  return (
    <div className={styles.cardHeader}>
      <h3 className={styles.cardTitle}>{title}</h3>
      {description && <p className={styles.cardDescription}>{description}</p>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  noPadding?: boolean;
}

export function CardContent({ children, noPadding = false }: CardContentProps) {
  const classes = [styles.cardContent, noPadding && styles.noPadding]
    .filter(Boolean)
    .join(" ");
  return <div className={classes}>{children}</div>;
}

interface CardFooterProps {
  children: ReactNode;
}

export function CardFooter({ children }: CardFooterProps) {
  return <div className={styles.cardFooter}>{children}</div>;
}
