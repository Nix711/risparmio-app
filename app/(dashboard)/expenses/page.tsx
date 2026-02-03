"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
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
  type: "expense" | "income";
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

const defaultColors = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#6366f1", "#f97316", "#14b8a6", "#71717a",
];

const defaultIcons = [
  "🛒", "🚗", "🏠", "💊", "🎬", "🛍️", "📄", "🍽️", "📱", "📦",
  "✈️", "🎮", "📚", "🏋️", "🎁", "☕", "🍕", "🎵", "💼", "🐕",
];

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("📦");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

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
  const [selectedType, setSelectedType] = useState<"" | "expense" | "income">("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/expenses?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedCategory) {
        url += `&categoryId=${selectedCategory}`;
      }
      if (selectedType) {
        url += `&type=${selectedType}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        setExpenses(data);
      } else {
        console.error("Errore API expenses:", data);
        setExpenses([]);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle transazioni:", error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, selectedCategory, selectedType]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        console.error("Errore API categories:", data);
        setCategories([]);
      }
    } catch (error) {
      console.error("Errore nel caricamento delle categorie:", error);
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const totalExpenses = expenses
    .filter((e) => e.type === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = expenses
    .filter((e) => e.type === "income")
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description") as string,
      categoryId: formData.get("categoryId") as string,
      date: formData.get("date") as string,
      type: formData.get("type") as "expense" | "income",
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
    if (!confirm("Sei sicuro di voler eliminare questa transazione?")) return;

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
    setSelectedCategoryId("");
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          icon: newCategoryIcon,
          color: newCategoryColor,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        await fetchCategories();
        setSelectedCategoryId(newCategory.id);
        setShowCategoryModal(false);
        setNewCategoryName("");
        setNewCategoryIcon("📦");
        setNewCategoryColor("#6366f1");
      }
    } catch (error) {
      console.error("Errore nella creazione della categoria:", error);
    }
  }

  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - i,
  );

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Transazioni</h1>
        <Button onClick={() => setShowModal(true)}>+ Nuova Transazione</Button>
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

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Tipo:</span>
          <select
            className={styles.filterSelect}
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as "" | "expense" | "income")}
          >
            <option value="">Tutti</option>
            <option value="expense">Spese</option>
            <option value="income">Entrate</option>
          </select>
        </div>
      </div>

      <div className={styles.summary}>
        <div>
          <p className={styles.summaryLabel}>Spese</p>
          <p className={styles.summaryValue}>{formatCurrency(totalExpenses)}</p>
        </div>
        <div>
          <p className={styles.summaryLabel}>Entrate</p>
          <p className={styles.summaryValuePositive}>{formatCurrency(totalIncome)}</p>
        </div>
        <div>
          <p className={styles.summaryLabel}>Bilancio</p>
          <p className={netBalance >= 0 ? styles.summaryValuePositive : styles.summaryValue}>
            {netBalance >= 0 ? "+" : ""}{formatCurrency(netBalance)}
          </p>
        </div>
        <p className={styles.summaryCount}>{expenses.length} transazioni</p>
      </div>

      {loading ? (
        <LoadingSpinner />
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
              <span className={expense.type === "income" ? styles.expenseAmountPositive : styles.expenseAmount}>
                {expense.type === "income" ? "+" : "-"}{formatCurrency(expense.amount)}
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
            <p className={styles.emptyText}>Nessuna transazione per questo periodo</p>
            <Button onClick={() => setShowModal(true)}>
              Aggiungi la prima transazione
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
                {editingExpense ? "Modifica Transazione" : "Nuova Transazione"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tipo</label>
                  <select
                    name="type"
                    className={styles.select}
                    defaultValue={editingExpense?.type || "expense"}
                    required
                  >
                    <option value="expense">Spesa</option>
                    <option value="income">Entrata</option>
                  </select>
                </div>

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
                  <div className={styles.categorySelectWrapper}>
                    <select
                      name="categoryId"
                      className={styles.select}
                      value={selectedCategoryId || editingExpense?.category.id || ""}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      required
                    >
                      <option value="">Seleziona categoria</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={styles.addCategoryButton}
                      onClick={() => setShowCategoryModal(true)}
                      title="Aggiungi categoria"
                    >
                      +
                    </button>
                  </div>
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

      {showCategoryModal && (
        <div className={styles.modal} onClick={() => setShowCategoryModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nuova Categoria</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowCategoryModal(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCreateCategory} className={styles.form}>
                <Input
                  name="categoryName"
                  type="text"
                  label="Nome categoria"
                  placeholder="es. Palestra"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />

                <div className={styles.formGroup}>
                  <label className={styles.label}>Icona</label>
                  <div className={styles.iconGrid}>
                    {defaultIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`${styles.iconButton} ${newCategoryIcon === icon ? styles.iconButtonActive : ""}`}
                        onClick={() => setNewCategoryIcon(icon)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Colore</label>
                  <div className={styles.colorGrid}>
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorButton} ${newCategoryColor === color ? styles.colorButtonActive : ""}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewCategoryColor(color)}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.categoryPreview}>
                  <div
                    className={styles.previewIcon}
                    style={{ backgroundColor: newCategoryColor + "20" }}
                  >
                    {newCategoryIcon}
                  </div>
                  <span>{newCategoryName || "Anteprima"}</span>
                </div>

                <div className={styles.formActions}>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCategoryModal(false)}
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
