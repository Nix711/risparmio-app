"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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

function ExpensesPageContent() {
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
  const FILTERS_STORAGE_KEY = "expenses-filters";

  // Controlla se l'URL ha filtri espliciti (escludendo "add")
  const hasUrlFilters = ["month", "year", "category", "type"].some(
    (key) => searchParams.has(key)
  );

  // Se l'URL non ha filtri, ripristina da localStorage e aggiorna l'URL
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  useEffect(() => {
    if (!hasUrlFilters && !restoredFromStorage) {
      try {
        const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const params = new URLSearchParams();
          if (parsed.month) params.set("month", parsed.month);
          if (parsed.year) params.set("year", parsed.year);
          if (parsed.category) params.set("category", parsed.category);
          if (parsed.type) params.set("type", parsed.type);
          if (params.toString()) {
            router.replace(`/expenses?${params.toString()}`, { scroll: false });
          }
        }
      } catch {}
      setRestoredFromStorage(true);
    }
  }, [hasUrlFilters, restoredFromStorage, router]);

  // Leggi i filtri dall'URL (con fallback ai valori di default)
  const selectedMonth = Number(searchParams.get("month")) || (currentDate.getMonth() + 1);
  const selectedYear = Number(searchParams.get("year")) || currentDate.getFullYear();
  const selectedCategory = searchParams.get("category") || "";
  const selectedType = (searchParams.get("type") || "") as "" | "expense" | "income";

  // Salva i filtri in localStorage ogni volta che cambiano
  useEffect(() => {
    if (hasUrlFilters) {
      const filters: Record<string, string> = {};
      if (searchParams.get("month")) filters.month = searchParams.get("month")!;
      if (searchParams.get("year")) filters.year = searchParams.get("year")!;
      if (searchParams.get("category")) filters.category = searchParams.get("category")!;
      if (searchParams.get("type")) filters.type = searchParams.get("type")!;
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [searchParams, hasUrlFilters]);

  // Funzione helper per aggiornare i search params nell'URL
  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/expenses?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Apri modal se c'è ?add=true nell'URL
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      setShowModal(true);
      // Rimuovi solo il parametro add, mantieni i filtri
      const params = new URLSearchParams(searchParams.toString());
      params.delete("add");
      const newUrl = params.toString() ? `/expenses?${params.toString()}` : "/expenses";
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

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
            onChange={(e) => updateFilter("month", e.target.value)}
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
            onChange={(e) => updateFilter("year", e.target.value)}
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
            onChange={(e) => updateFilter("category", e.target.value)}
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
            onChange={(e) => updateFilter("type", e.target.value)}
          >
            <option value="">Tutti</option>
            <option value="expense">Spese</option>
            <option value="income">Entrate</option>
          </select>
        </div>
      </div>

      <div className={styles.summary}>
        {selectedType === "" ? (
          <>
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
          </>
        ) : selectedType === "expense" ? (
          <>
            <div>
              <p className={styles.summaryLabel}>Totale Spese</p>
              <p className={styles.summaryValue}>{formatCurrency(totalExpenses)}</p>
            </div>
            <p className={styles.summaryCount}>{expenses.length} spese</p>
          </>
        ) : (
          <>
            <div>
              <p className={styles.summaryLabel}>Totale Entrate</p>
              <p className={styles.summaryValuePositive}>{formatCurrency(totalIncome)}</p>
            </div>
            <p className={styles.summaryCount}>{expenses.length} entrate</p>
          </>
        )}
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

export default function ExpensesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ExpensesPageContent />
    </Suspense>
  );
}
