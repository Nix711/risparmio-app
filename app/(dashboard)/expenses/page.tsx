"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import styles from "./page.module.css";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  isDefault: boolean;
}

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  category: Category;
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

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const currentDate = new Date();

  // Apri modal se c'è ?add=true nell'URL
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setShowModal(true);
      // Rimuovi il parametro dall'URL
      router.replace("/expenses", { scroll: false });
    }
  }, [searchParams, router]);
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedCategory, setSelectedCategory] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/expenses?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error("Errore nel caricamento delle spese:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedCategory]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Errore nel caricamento delle categorie:", error);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description") as string,
      categoryId: formData.get("categoryId") as string,
      date: formData.get("date") as string,
    };

    try {
      if (editingExpense) {
        await fetch(`/api/expenses/${editingExpense.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } else {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }
      setShowModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (error) {
      console.error("Errore nel salvataggio:", error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa spesa?")) return;

    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      fetchExpenses();
    } catch (error) {
      console.error("Errore nell'eliminazione:", error);
    }
  }

  function openEditModal(expense: Expense) {
    setEditingExpense(expense);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingExpense(null);
  }

  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i,
  );

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Spese</h1>
        <Button onClick={() => setShowModal(true)}>+ Nuova Spesa</Button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Mese:</span>
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
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Anno:</span>
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

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Categoria:</span>
          <select
            className={styles.filterSelect}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tutte</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.summary}>
        <div>
          <p className={styles.summaryLabel}>Totale spese</p>
          <p className={styles.summaryValue}>{formatCurrency(totalExpenses)}</p>
        </div>
        <p className={styles.summaryCount}>{expenses.length} transazioni</p>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <p>Caricamento...</p>
        </div>
      ) : expenses.length > 0 ? (
        <div className={styles.expensesList}>
          {expenses.map((expense) => (
            <div key={expense.id} className={styles.expenseItem}>
              <div className={styles.expenseInfo}>
                <div
                  className={styles.expenseIcon}
                  style={{ backgroundColor: expense.category.color + "20" }}
                >
                  {expense.category.icon || "📦"}
                </div>
                <div className={styles.expenseDetails}>
                  <p className={styles.expenseCategory}>
                    {expense.category.name}
                  </p>
                  {expense.description && (
                    <p className={styles.expenseDescription}>
                      {expense.description}
                    </p>
                  )}
                  <p className={styles.expenseDate}>
                    {formatDate(expense.date, "long")}
                  </p>
                </div>
              </div>
              <span className={styles.expenseAmount}>
                -{formatCurrency(expense.amount)}
              </span>
              <div className={styles.expenseActions}>
                <button
                  className={styles.actionButton}
                  onClick={() => openEditModal(expense)}
                  title="Modifica"
                >
                  ✏️
                </button>
                <button
                  className={`${styles.actionButton} ${styles.deleteButton}`}
                  onClick={() => handleDelete(expense.id)}
                  title="Elimina"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.expensesList}>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💰</div>
            <p className={styles.emptyText}>Nessuna spesa per questo periodo</p>
            <Button onClick={() => setShowModal(true)}>
              Aggiungi la prima spesa
            </Button>
          </div>
        </div>
      )}

      {showModal && (
        <div className={styles.modal} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingExpense ? "Modifica Spesa" : "Nuova Spesa"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  label="Importo (€)"
                  placeholder="0.00"
                  defaultValue={editingExpense?.amount}
                  required
                />

                <div className={styles.formGroup}>
                  <label className={styles.label}>Categoria</label>
                  <select
                    name="categoryId"
                    className={styles.select}
                    defaultValue={editingExpense?.category.id}
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  name="description"
                  type="text"
                  label="Descrizione (opzionale)"
                  placeholder="es. Spesa al supermercato"
                  defaultValue={editingExpense?.description || ""}
                />

                <Input
                  name="date"
                  type="date"
                  label="Data"
                  defaultValue={
                    editingExpense
                      ? new Date(editingExpense.date)
                          .toISOString()
                          .split("T")[0]
                      : new Date().toISOString().split("T")[0]
                  }
                  required
                />

                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                  >
                    Annulla
                  </Button>
                  <Button type="submit">
                    {editingExpense ? "Salva" : "Aggiungi"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
