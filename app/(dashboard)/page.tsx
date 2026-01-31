import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthRange, formatMonthYear } from "@/lib/utils/date";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

async function getDashboardData(userId: string) {
  const { start, end } = getCurrentMonthRange();

  const [expenses, goals, previousMonthExpenses] = await Promise.all([
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.goal.findMany({
      where: {
        userId,
        month: start.getMonth() + 1,
        year: start.getFullYear(),
      },
    }),
    prisma.expense.aggregate({
      where: {
        userId,
        date: {
          gte: new Date(start.getFullYear(), start.getMonth() - 1, 1),
          lt: start,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const previousTotal = previousMonthExpenses._sum.amount || 0;
  const changePercent =
    previousTotal > 0
      ? ((totalExpenses - previousTotal) / previousTotal) * 100
      : 0;

  const categoryTotals = expenses.reduce(
    (acc, e) => {
      acc[e.category.name] = (acc[e.category.name] || 0) + e.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return {
    totalExpenses,
    changePercent,
    goals,
    recentExpenses: expenses.slice(0, 5),
    topCategories,
    expenseCount: expenses.length,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const data = await getDashboardData(session.user.id);
  const currentMonth = formatMonthYear(new Date());

  return (
    <div>
      <header className={styles.sectionHeader}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Dashboard
          </h1>
          <p
            style={{
              color: "#6b7280",
              margin: "0.25rem 0 0",
              fontSize: "0.875rem",
            }}
          >
            {currentMonth}
          </p>
        </div>
        <Link href="/expenses">
          <Button>+ Nuova Spesa</Button>
        </Link>
      </header>

      <div className={styles.grid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Spese del mese</p>
            <span className={styles.statIcon}>💰</span>
          </div>
          <p className={styles.statValue}>
            {formatCurrency(data.totalExpenses)}
          </p>
          {data.changePercent !== 0 && (
            <p
              className={`${styles.statChange} ${data.changePercent > 0 ? styles.negative : styles.positive}`}
            >
              {data.changePercent > 0 ? "+" : ""}
              {data.changePercent.toFixed(1)}% vs mese scorso
            </p>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Transazioni</p>
            <span className={styles.statIcon}>📝</span>
          </div>
          <p className={styles.statValue}>{data.expenseCount}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Goal attivi</p>
            <span className={styles.statIcon}>🎯</span>
          </div>
          <p className={styles.statValue}>{data.goals.length}</p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Top categoria</p>
            <span className={styles.statIcon}>📊</span>
          </div>
          <p className={styles.statValue}>
            {data.topCategories[0]?.[0] || "-"}
          </p>
          {data.topCategories[0] && (
            <p className={styles.statChange}>
              {formatCurrency(data.topCategories[0][1])}
            </p>
          )}
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Goal del mese</h2>
          <Link href="/statistics">
            <Button variant="ghost" size="small">
              Gestisci
            </Button>
          </Link>
        </div>
        {data.goals.length > 0 ? (
          <div className={styles.goalsGrid}>
            {data.goals.map((goal) => {
              const progress =
                goal.type === "saving"
                  ? (goal.currentAmount / goal.targetAmount) * 100
                  : (data.totalExpenses / goal.targetAmount) * 100;
              const isOverLimit = goal.type === "limit" && progress > 100;
              const progressColor = isOverLimit
                ? styles.progressRed
                : progress > 80
                  ? styles.progressYellow
                  : styles.progressGreen;

              return (
                <div key={goal.id} className={styles.goalCard}>
                  <div className={styles.goalHeader}>
                    <p className={styles.goalName}>{goal.name}</p>
                    <span
                      className={`${styles.goalType} ${goal.type === "saving" ? styles.goalTypeSaving : styles.goalTypeLimit}`}
                    >
                      {goal.type === "saving" ? "Risparmio" : "Limite"}
                    </span>
                  </div>
                  <div className={styles.goalProgress}>
                    <div className={styles.progressBar}>
                      <div
                        className={`${styles.progressFill} ${progressColor}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.goalStats}>
                    <span>
                      {goal.type === "saving"
                        ? formatCurrency(goal.currentAmount)
                        : formatCurrency(data.totalExpenses)}
                    </span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <p className={styles.emptyText}>
              Nessun goal per questo mese. Creane uno dalla pagina statistiche!
            </p>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ultime spese</h2>
          <Link href="/expenses">
            <Button variant="ghost" size="small">
              Vedi tutte
            </Button>
          </Link>
        </div>
        {data.recentExpenses.length > 0 ? (
          <div className={styles.recentList}>
            {data.recentExpenses.map((expense) => (
              <div key={expense.id} className={styles.recentItem}>
                <div className={styles.recentInfo}>
                  <div
                    className={styles.recentIcon}
                    style={{ backgroundColor: expense.category.color + "20" }}
                  >
                    {expense.category.icon || "📦"}
                  </div>
                  <div className={styles.recentDetails}>
                    <span className={styles.recentCategory}>
                      {expense.description || expense.category.name}
                    </span>
                    <span className={styles.recentDate}>
                      {formatDate(expense.date)}
                    </span>
                  </div>
                </div>
                <span className={styles.recentAmount}>
                  -{formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💰</div>
            <p className={styles.emptyText}>
              Nessuna spesa registrata questo mese
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
