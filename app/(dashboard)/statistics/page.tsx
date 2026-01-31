"use client";

import { useState, useEffect, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expensesRes, goalsRes] = await Promise.all([
        fetch(`/api/expenses?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/goals?month=${selectedMonth}&year=${selectedYear}`),
      ]);
      const [expensesData, goalsData] = await Promise.all([
        expensesRes.json(),
        goalsRes.json(),
      ]);
      setExpenses(expensesData);
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

  // Dati per grafico a barre per settimana
  const weeklyData = expenses.reduce(
    (acc, e) => {
      const date = new Date(e.date);
      const weekNum = Math.ceil(date.getDate() / 7);
      const weekLabel = `Sett. ${weekNum}`;
      const existing = acc.find((item) => item.week === weekLabel);
      if (existing) {
        existing.amount += e.amount;
      } else {
        acc.push({ week: weekLabel, amount: e.amount });
      }
      return acc;
    },
    [] as { week: string; amount: number }[]
  );

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
        <h1 className={styles.title}>Statistiche</h1>
      </div>

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

      <div className={styles.grid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Spese per Categoria</h3>
          <div className={styles.chartContainer}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>Nessun dato disponibile</p>
              </div>
            )}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Spese Settimanali</h3>
          <div className={styles.chartContainer}>
            {weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Legend />
                  <Bar dataKey="amount" fill="#6366f1" name="Spese" />
                </BarChart>
              </ResponsiveContainer>
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
