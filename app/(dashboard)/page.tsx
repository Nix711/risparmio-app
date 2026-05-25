import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentMonthRange } from "@/lib/utils/date";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import styles from "./page.module.css";

// ─── SVG Trend Chart ─────────────────────────────────────────────────────────
function buildTrendPaths(
  data: { income: number; expense: number; label?: string }[],
  W = 320,
  H = 96
) {
  if (data.length < 2) return null;
  const all = data.flatMap((d) => [d.income, d.expense]);
  const max = Math.max(...all, 1);
  const pad = { t: 8, b: 8, l: 0, r: 0 };
  const xStep = (W - pad.l - pad.r) / (data.length - 1);
  const toY = (v: number) =>
    pad.t + ((max - v) / max) * (H - pad.t - pad.b);
  const toX = (i: number) => pad.l + i * xStep;

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L${toX(vals.length - 1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`;

  return {
    W,
    H,
    income: { line: linePath(data.map((d) => d.income)), area: areaPath(data.map((d) => d.income)) },
    expense: { line: linePath(data.map((d) => d.expense)), area: areaPath(data.map((d) => d.expense)) },
    labels: data.map((d, i) => ({ label: d.label ?? "", x: toX(i) })),
  };
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getDashboardData(userId: string) {
  const { start, end } = getCurrentMonthRange();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    expenses,
    incomes,
    goals,
    previousMonthExpenses,
    previousMonthIncomes,
    trendIncomeRaw,
    trendExpenseRaw,
  ] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end }, type: "expense" },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lte: end }, type: "income" },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.goal.findMany({
      where: { userId, month: start.getMonth() + 1, year: start.getFullYear() },
    }),
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
    prisma.expense.findMany({
      where: { userId, type: "income", date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    }),
    prisma.expense.findMany({
      where: { userId, type: "expense", date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
    }),
  ]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomes.reduce((s, e) => s + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const prevExp = previousMonthExpenses._sum.amount ?? 0;
  const prevInc = previousMonthIncomes._sum.amount ?? 0;
  const expenseChangePct = prevExp > 0 ? ((totalExpenses - prevExp) / prevExp) * 100 : 0;
  const incomeChangePct = prevInc > 0 ? ((totalIncome - prevInc) / prevInc) * 100 : 0;

  // Top categories (expense only)
  const catTotals: Record<string, { amount: number; icon: string; color: string }> = {};
  for (const e of expenses) {
    const key = e.category.name;
    if (!catTotals[key]) {
      catTotals[key] = { amount: 0, icon: e.category.icon || "📦", color: e.category.color || "#7B61FF" };
    }
    catTotals[key].amount += e.amount;
  }
  const topCategories = Object.entries(catTotals)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 4)
    .map(([name, d]) => ({
      name,
      amount: d.amount,
      icon: d.icon,
      color: d.color,
      percent: totalExpenses > 0 ? (d.amount / totalExpenses) * 100 : 0,
    }));

  // 6-month trend data
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = new Intl.DateTimeFormat("it-IT", { month: "short" }).format(d);
    const income = trendIncomeRaw
      .filter((e) => {
        const ed = new Date(e.date);
        return `${ed.getFullYear()}-${ed.getMonth()}` === key;
      })
      .reduce((s, e) => s + e.amount, 0);
    const expense = trendExpenseRaw
      .filter((e) => {
        const ed = new Date(e.date);
        return `${ed.getFullYear()}-${ed.getMonth()}` === key;
      })
      .reduce((s, e) => s + e.amount, 0);
    return { label, income, expense };
  });

  const allTransactions = [...expenses, ...incomes]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return {
    totalExpenses,
    totalIncome,
    netBalance,
    expenseChangePct,
    incomeChangePct,
    goals,
    recentTransactions: allTransactions,
    topCategories,
    trendData,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let data;
  try {
    data = await getDashboardData(session.user.id);
  } catch (error) {
    return (
      <div style={{ padding: "2rem", color: "var(--expense)" }}>
        <h1>Errore caricamento</h1>
        <pre style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }

  const userName = session.user.name?.split(" ")[0] || "utente";
  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" }).format(now);
  const netSign = data.netBalance >= 0 ? "+" : "\u2212";
  const netAbs = Math.abs(data.netBalance);
  const trendChart = buildTrendPaths(data.trendData);

  return (
    <div className={styles.page}>

      {/* ── Greeting row ── */}
      <div className={styles.greetingRow}>
        <div>
          <p className={styles.eyebrow}>{monthLabel}</p>
          <h1 className={styles.greeting}>Ciao, {userName}</h1>
        </div>
        <div className={styles.avatarCircle}>
          {userName[0].toUpperCase()}
        </div>
      </div>

      {/* ── Hero card: Saldo netto ── */}
      <div className={styles.heroCard}>
        <div className={styles.heroGlow} />
        <div className={styles.heroTop}>
          <span className={styles.heroEyebrow}>Saldo netto del mese</span>
          {data.incomeChangePct !== 0 && (
            <span className={`${styles.heroPill} ${data.incomeChangePct >= 0 ? styles.heroPillPositive : styles.heroPillNegative}`}>
              {data.incomeChangePct >= 0 ? "↑" : "↓"} {Math.abs(data.incomeChangePct).toFixed(0)}%
            </span>
          )}
        </div>
        <p className={styles.heroAmount}>
          <span className={data.netBalance >= 0 ? styles.heroSign : styles.heroSignNeg}>{netSign}</span>
          {formatCurrency(netAbs)}
        </p>
        <div className={styles.heroMiniCards}>
          <div className={styles.miniCardIncome}>
            <span className={styles.miniCardEyebrow}>ENTRATE</span>
            <span className={styles.miniCardValue}>{formatCurrency(data.totalIncome)}</span>
          </div>
          <div className={styles.miniCardExpense}>
            <span className={styles.miniCardEyebrow}>SPESE</span>
            <span className={styles.miniCardValue}>{formatCurrency(data.totalExpenses)}</span>
          </div>
        </div>
      </div>

      {/* ── Trend 6 mesi ── */}
      {trendChart && (
        <div className={styles.trendCard}>
          <div className={styles.trendHeader}>
            <span className={styles.cardTitle}>Andamento 6 mesi</span>
            <Link href="/statistics" className={styles.cardAction}>Dettagli →</Link>
          </div>
          <svg
            viewBox={`0 0 ${trendChart.W} ${trendChart.H}`}
            width="100%"
            height={trendChart.H}
            className={styles.trendSvg}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3DDC97" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3DDC97" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((r) => (
              <line
                key={r}
                x1="0" y1={trendChart.H * r} x2={trendChart.W} y2={trendChart.H * r}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 4"
              />
            ))}
            {/* Area fills */}
            <path d={trendChart.income.area} fill="url(#incGrad)" />
            <path d={trendChart.expense.area} fill="url(#expGrad)" />
            {/* Lines */}
            <path d={trendChart.income.line} stroke="#3DDC97" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={trendChart.expense.line} stroke="#FF6B6B" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className={styles.trendLegend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDotIncome} />Entrate
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDotExpense} />Spese
            </span>
          </div>
        </div>
      )}

      {/* ── Top categorie spese ── */}
      {data.topCategories.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>TOP CATEGORIE SPESE</span>
            <Link href="/expenses" className={styles.cardAction}>Tutte</Link>
          </div>
          <div className={styles.categoriesList}>
            {data.topCategories.map((cat) => (
              <div key={cat.name} className={styles.categoryRow}>
                <div className={styles.catRowTop}>
                  <div className={styles.catLeft}>
                    <span className={styles.catIcon}>{cat.icon}</span>
                    <span className={styles.catName}>{cat.name}</span>
                    <span className={styles.catPercent}>{cat.percent.toFixed(0)}%</span>
                  </div>
                  <span className={styles.catAmount}>{formatCurrency(cat.amount)}</span>
                </div>
                <div className={styles.catTrack}>
                  <div
                    className={styles.catFill}
                    style={{
                      width: `${cat.percent}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Obiettivi attivi ── */}
      {data.goals.length > 0 && (
        <div className={styles.goalsSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>OBIETTIVI ATTIVI</span>
            <Link href="/statistics" className={styles.cardAction}>Gestisci</Link>
          </div>
          <div className={styles.goalsCarousel}>
            {data.goals.map((goal) => {
              const progress =
                goal.type === "saving"
                  ? (goal.currentAmount / goal.targetAmount) * 100
                  : (data.totalExpenses / goal.targetAmount) * 100;
              const clamped = Math.min(progress, 100);
              const isOver = goal.type === "limit" && progress > 100;
              const fillColor = isOver ? "var(--expense)" : clamped > 80 ? "var(--warn)" : "var(--goal)";
              return (
                <div key={goal.id} className={styles.goalCard}>
                  <div className={styles.goalIcon}>
                    {goal.type === "saving" ? "🎯" : "💸"}
                  </div>
                  <p className={styles.goalName}>{goal.name}</p>
                  <p className={styles.goalAmount}>{formatCurrency(goal.targetAmount)}</p>
                  <div className={styles.goalTrack}>
                    <div
                      className={styles.goalFill}
                      style={{ width: `${clamped}%`, background: fillColor }}
                    />
                  </div>
                  <p className={styles.goalPct} style={{ color: fillColor }}>
                    {Math.round(clamped)}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Ultime transazioni ── */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>ULTIME TRANSAZIONI</span>
          <Link href="/expenses" className={styles.cardAction}>Tutte</Link>
        </div>
        {data.recentTransactions.length > 0 ? (
          <div className={styles.txList}>
            {data.recentTransactions.map((tx, idx) => (
              <div
                key={tx.id}
                className={styles.txRow}
                style={idx < data.recentTransactions.length - 1 ? {} : { borderBottom: "none" }}
              >
                <div
                  className={styles.txIcon}
                  style={{ backgroundColor: tx.category.color + "33", borderColor: tx.category.color + "55" }}
                >
                  {tx.category.icon || "📦"}
                </div>
                <div className={styles.txDetails}>
                  <span className={styles.txDesc}>{tx.description || tx.category.name}</span>
                  <span className={styles.txMeta}>{tx.category.name} · {formatDate(tx.date)}</span>
                </div>
                <span className={tx.type === "income" ? styles.txAmountPos : styles.txAmountNeg}>
                  {tx.type === "income" ? "+" : "\u2212"}{formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Nessuna transazione questo mese</p>
          </div>
        )}
      </div>

    </div>
  );
}
