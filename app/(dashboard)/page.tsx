import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthRange } from "@/lib/utils/date";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/Button";
import styles from "./page.module.css";

async function getDashboardData(userId: string) {
  const { start, end } = getCurrentMonthRange();

  const [expenses, incomes, goals, previousMonthExpenses, previousMonthIncomes] = await Promise.all([
    // Solo spese (type = expense)
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        type: "expense",
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    // Solo entrate (type = income)
    prisma.expense.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
        type: "income",
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
    // Spese mese precedente
    prisma.expense.aggregate({
      where: {
        userId,
        type: "expense",
        date: {
          gte: new Date(start.getFullYear(), start.getMonth() - 1, 1),
          lt: start,
        },
      },
      _sum: { amount: true },
    }),
    // Entrate mese precedente
    prisma.expense.aggregate({
      where: {
        userId,
        type: "income",
        date: {
          gte: new Date(start.getFullYear(), start.getMonth() - 1, 1),
          lt: start,
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const previousExpenseTotal = previousMonthExpenses._sum.amount || 0;
  const previousIncomeTotal = previousMonthIncomes._sum.amount || 0;

  const expenseChangePercent =
    previousExpenseTotal > 0
      ? ((totalExpenses - previousExpenseTotal) / previousExpenseTotal) * 100
      : 0;

  const incomeChangePercent =
    previousIncomeTotal > 0
      ? ((totalIncome - previousIncomeTotal) / previousIncomeTotal) * 100
      : 0;

  // Categorie solo per spese
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

  // Combina tutte le transazioni per "Ultime transazioni"
  const allTransactions = [...expenses, ...incomes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    totalExpenses,
    totalIncome,
    netBalance,
    expenseChangePercent,
    incomeChangePercent,
    goals,
    recentTransactions: allTransactions,
    topCategories,
    transactionCount: expenses.length + incomes.length,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let data;
  try {
    data = await getDashboardData(session.user.id);
  } catch (error) {
    console.error("Dashboard error:", error);
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Errore nel caricamento della dashboard</h1>
        <pre style={{ background: "#fee2e2", padding: "1rem", borderRadius: "0.5rem", whiteSpace: "pre-wrap" }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }

  const userName = session.user.name || "utente";

  return (
    <div>
      <header className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.dashboardTitle}>Ciao {userName}</h1>
        </div>
        <Link href="/expenses">
          <Button>+ Nuova Transazione</Button>
        </Link>
      </header>

      <div className={styles.mainCards}>
        <div className={`${styles.statCard} ${styles.statCardExpense}`}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Spese</p>
            <span className={styles.statIcon}>💸</span>
          </div>
          <p className={styles.statValue}>
            {formatCurrency(data.totalExpenses)}
          </p>
          {data.expenseChangePercent !== 0 && (
            <p
              className={`${styles.statChange} ${data.expenseChangePercent > 0 ? styles.negative : styles.positive}`}
            >
              {data.expenseChangePercent > 0 ? "+" : ""}
              {data.expenseChangePercent.toFixed(1)}% vs mese scorso
            </p>
          )}
        </div>

        <div className={`${styles.statCard} ${styles.statCardIncome}`}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Entrate</p>
            <span className={styles.statIcon}>💰</span>
          </div>
          <p className={styles.statValue}>
            {formatCurrency(data.totalIncome)}
          </p>
          {data.incomeChangePercent !== 0 && (
            <p
              className={`${styles.statChange} ${data.incomeChangePercent > 0 ? styles.positive : styles.negative}`}
            >
              {data.incomeChangePercent > 0 ? "+" : ""}
              {data.incomeChangePercent.toFixed(1)}% vs mese scorso
            </p>
          )}
        </div>

        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>Bilancio</p>
          <p className={styles.balanceValue}>
            {data.netBalance >= 0 ? "+" : ""}{formatCurrency(data.netBalance)}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Transazioni</p>
            <span className={styles.statIcon}>📝</span>
          </div>
          <p className={styles.statValue}>{data.transactionCount}</p>
          {data.recentTransactions[0] && (
            <div className={styles.statLastTransaction}>
              <span className={styles.statLastTransactionText}>
                {data.recentTransactions[0].category.icon || "📦"} {data.recentTransactions[0].category.name}
              </span>
              <span className={`${styles.statBalanceValue} ${data.recentTransactions[0].type === "income" ? styles.positive : styles.negative}`}>
                {data.recentTransactions[0].type === "income" ? "+" : "-"}{formatCurrency(data.recentTransactions[0].amount)}
              </span>
            </div>
          )}
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Goal attivi</p>
            <span className={styles.statIcon}>🎯</span>
          </div>
          {data.goals.length > 0 ? (
            <div
              className={styles.goalsList}
              data-count={data.goals.length}
            >
              {data.goals.map((goal) => {
                const progress =
                  goal.type === "saving"
                    ? (goal.currentAmount / goal.targetAmount) * 100
                    : (data.totalExpenses / goal.targetAmount) * 100;
                return (
                  <div key={goal.id} className={styles.goalsListItem}>
                    <span className={styles.goalsListName}>{goal.name}</span>
                    <span className={styles.goalsListPercent}>
                      {Math.round(Math.min(progress, 100))}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.statValue}>-</p>
          )}
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
                    <span className={styles.goalPercentage}>
                      {Math.round(Math.min(progress, 100))}%
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
          <h2 className={styles.sectionTitle}>Ultime transazioni</h2>
          <Link href="/expenses">
            <Button variant="ghost" size="small">
              Vedi tutte
            </Button>
          </Link>
        </div>
        {data.recentTransactions.length > 0 ? (
          <div className={styles.recentList}>
            {data.recentTransactions.map((transaction) => (
              <div key={transaction.id} className={styles.recentItem}>
                <div className={styles.recentInfo}>
                  <div
                    className={styles.recentIcon}
                    style={{ backgroundColor: transaction.category.color + "20" }}
                  >
                    {transaction.category.icon || "📦"}
                  </div>
                  <div className={styles.recentDetails}>
                    <span className={styles.recentCategory}>
                      {transaction.description || transaction.category.name}
                    </span>
                    <span className={styles.recentDate}>
                      {formatDate(transaction.date)}
                    </span>
                  </div>
                </div>
                <span className={transaction.type === "income" ? styles.recentAmountPositive : styles.recentAmount}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💰</div>
            <p className={styles.emptyText}>
              Nessuna transazione registrata questo mese
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
