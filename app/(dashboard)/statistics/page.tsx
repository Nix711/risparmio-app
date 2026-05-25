"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./page.module.css";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
}

interface Expense {
  id: string;
  amount: number;
  date: string;
  type: "expense" | "income";
  category: Category;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  type: "saving" | "limit";
  month: number;
  year: number;
}

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const months = [
  { value: 1, label: "Gennaio" },
  { value: 2, label: "Febbraio" },
  { value: 3, label: "Marzo" },
  { value: 4, label: "Aprile" },
  { value: 5, label: "Maggio" },
  { value: 6, label: "Giugno" },
  { value: 7, label: "Luglio" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Settembre" },
  { value: 10, label: "Ottobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Dicembre" },
];

export default function StatisticsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, incomesRes, goalsRes] = await Promise.all([
        fetch(`/api/expenses?month=${selectedMonth}&year=${selectedYear}&type=expense`),
        fetch(`/api/expenses?month=${selectedMonth}&year=${selectedYear}&type=income`),
        fetch(`/api/goals?month=${selectedMonth}&year=${selectedYear}`),
      ]);
      const [expensesData, incomesData, goalsData] = await Promise.all([
        expensesRes.json(),
        incomesRes.json(),
        goalsRes.json(),
      ]);
      setExpenses(expensesData);
      setIncomes(incomesData);
      setGoals(goalsData);
    } catch (error) {
      console.error("Errore nel caricamento:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = incomes.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  // Dati per grafico a torta per categoria
  const categoryData = expenses.reduce(
    (acc, e) => {
      const existing = acc.find((item) => item.name === e.category.name);
      if (existing) {
        existing.value += e.amount;
      } else {
        acc.push({
          name: e.category.name,
          value: e.amount,
          color: e.category.color,
          icon: e.category.icon,
        });
      }
      return acc;
    },
    [] as { name: string; value: number; color: string; icon: string | null }[]
  );

  // Dati per grafico a barre settimanali con spese ed entrate
  const weeklyData = (() => {
    const weeks: { week: string; spese: number; entrate: number }[] = [];

    // Processa spese
    expenses.forEach((e) => {
      const date = new Date(e.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekLabel = `Sett. ${weekNum}`;
      let existing = weeks.find((item) => item.week === weekLabel);
      if (!existing) {
        existing = { week: weekLabel, spese: 0, entrate: 0 };
        weeks.push(existing);
      }
      existing.spese += e.amount;
    });

    // Processa entrate
    incomes.forEach((e) => {
      const date = new Date(e.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekLabel = `Sett. ${weekNum}`;
      let existing = weeks.find((item) => item.week === weekLabel);
      if (!existing) {
        existing = { week: weekLabel, spese: 0, entrate: 0 };
        weeks.push(existing);
      }
      existing.entrate += e.amount;
    });

    return weeks.sort((a, b) => {
      const aNum = parseInt(a.week.replace("Sett. ", ""));
      const bNum = parseInt(b.week.replace("Sett. ", ""));
      return aNum - bNum;
    });
  })();

  async function handleCreateGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      name: formData.get("name") as string,
      targetAmount: parseFloat(formData.get("targetAmount") as string),
      type: formData.get("type") as "saving" | "limit",
      month: selectedMonth,
      year: selectedYear,
    };

    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setShowGoalModal(false);
      fetchData();
    } catch (error) {
      console.error("Errore nella creazione del goal:", error);
    }
  }

  async function handleUpdateSaving(goalId: string, amount: number) {
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentAmount: amount }),
      });
      fetchData();
    } catch (error) {
      console.error("Errore nell'aggiornamento:", error);
    }
  }

  async function handleDeleteGoal(goalId: string) {
    if (!confirm("Sei sicuro di voler eliminare questo goal?")) return;
    try {
      await fetch(`/api/goals/${goalId}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Statistiche</h1>
          <button
            className={`${styles.filterToggleButton} ${showFilters ? styles.filterToggleButtonActive : ""}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Filtri"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <p className={styles.summaryCardLabel}>Totale Spese</p>
          <p className={styles.summaryCardValue} style={{ color: "#ef4444" }}>
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryCardLabel}>Totale Entrate</p>
          <p className={styles.summaryCardValue} style={{ color: "#22c55e" }}>
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className={styles.summaryCard}>
          <p className={styles.summaryCardLabel}>Bilancio Netto</p>
          <p
            className={styles.summaryCardValue}
            style={{ color: netBalance >= 0 ? "#22c55e" : "#ef4444" }}
          >
            {netBalance >= 0 ? "+" : ""}
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Spese per Categoria</h3>
          <div className={styles.chartContainer}>
            {categoryData.length > 0 ? (
              <Pie
                data={{
                  labels: categoryData.map((d) => d.name),
                  datasets: [{
                    data: categoryData.map((d) => d.value),
                    backgroundColor: categoryData.map((d) => d.color),
                    borderColor: categoryData.map((d) => d.color),
                    borderWidth: 1,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: { color: "#9B9BA8", font: { size: 12 }, padding: 16 },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${formatCurrency(ctx.parsed)}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Spese vs Entrate Settimanali</h3>
          <div className={styles.chartContainer}>
            {weeklyData.length > 0 ? (
              <Bar
                data={{
                  labels: weeklyData.map((d) => d.week),
                  datasets: [
                    {
                      label: "Spese",
                      data: weeklyData.map((d) => d.spese),
                      backgroundColor: "rgba(255, 107, 107, 0.7)",
                      borderColor: "#FF6B6B",
                      borderWidth: 1,
                      borderRadius: 6,
                    },
                    {
                      label: "Entrate",
                      data: weeklyData.map((d) => d.entrate),
                      backgroundColor: "rgba(61, 220, 151, 0.7)",
                      borderColor: "#3DDC97",
                      borderWidth: 1,
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      labels: { color: "#9B9BA8", font: { size: 12 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#9B9BA8" },
                      grid: { color: "rgba(255,255,255,0.04)" },
                    },
                    y: {
                      ticks: {
                        color: "#9B9BA8",
                        callback: (value) => formatCurrency(value as number),
                      },
                      grid: { color: "rgba(255,255,255,0.04)" },
                    },
                  },
                }}
              />
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Goal del Mese</h2>
          <Button onClick={() => setShowGoalModal(true)}>+ Nuovo Goal</Button>
        </div>
        {goals.length > 0 ? (
          <div className={styles.goalsGrid}>
            {goals.map((goal) => {
              const progress =
                goal.type === "saving"
                  ? (goal.currentAmount / goal.targetAmount) * 100
                  : (totalExpenses / goal.targetAmount) * 100;
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
                    <div className={styles.goalActions}>
                      <span
                        className={`${styles.goalType} ${goal.type === "saving" ? styles.goalTypeSaving : styles.goalTypeLimit}`}
                      >
                        {goal.type === "saving" ? "Risparmio" : "Limite"}
                      </span>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeleteGoal(goal.id)}
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </div>
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
                        : formatCurrency(totalExpenses)}
                    </span>
                    <span className={styles.goalPercentage}>
                      {Math.round(Math.min(progress, 100))}%
                    </span>
                    <span>{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  {goal.type === "saving" && (
                    <div className={styles.savingInput}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Aggiungi risparmio"
                        className={styles.savingInputField}
                        id={`saving-${goal.id}`}
                      />
                      <button
                        className={styles.savingButton}
                        onClick={() => {
                          const input = document.getElementById(
                            `saving-${goal.id}`
                          ) as HTMLInputElement;
                          const amount = parseFloat(input.value) || 0;
                          handleUpdateSaving(
                            goal.id,
                            goal.currentAmount + amount
                          );
                          input.value = "";
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎯</div>
            <p className={styles.emptyText}>
              Nessun goal per questo mese
            </p>
            <Button onClick={() => setShowGoalModal(true)}>
              Crea il primo goal
            </Button>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dettaglio Categorie</h2>
        {categoryData.length > 0 ? (
          <div className={styles.categoryList}>
            {categoryData
              .sort((a, b) => b.value - a.value)
              .map((cat) => {
                const percentage = (cat.value / totalExpenses) * 100;
                return (
                  <div key={cat.name} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}>
                      <span
                        className={styles.categoryIcon}
                        style={{ backgroundColor: cat.color + "20" }}
                      >
                        {cat.icon || "📦"}
                      </span>
                      <span className={styles.categoryName}>{cat.name}</span>
                    </div>
                    <div className={styles.categoryRight}>
                      <span className={styles.categoryAmount}>
                        {formatCurrency(cat.value)}
                      </span>
                      <span className={styles.categoryPercentage}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Nessuna spesa registrata</p>
          </div>
        )}
      </section>

      {showGoalModal && (
        <div className={styles.modal} onClick={() => setShowGoalModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nuovo Goal</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowGoalModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateGoal} className={styles.form}>
                <Input
                  name="name"
                  type="text"
                  label="Nome del goal"
                  placeholder="es. Risparmio vacanze"
                  required
                />

                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo</label>
                  <select name="type" className={styles.select} required>
                    <option value="saving">
                      Risparmio (accumula un importo)
                    </option>
                    <option value="limit">
                      Limite (non superare un importo)
                    </option>
                  </select>
                </div>

                <Input
                  name="targetAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  label="Obiettivo (€)"
                  placeholder="0.00"
                  required
                />

                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowGoalModal(false)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit">Crea</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
