"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./page.module.css";

interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  note?: string | null;
  createdAt: string;
}

interface SavingGoal {
  id: string;
  name: string;
  emoji: string;
  saved: number;
  target: number;
  due: string;
  accent: string;
  createdAt: string;
  contributions: GoalContribution[];
}

const ACCENT_COLORS = [
  "#A78BFA",
  "#60A5FA",
  "#3DDC97",
  "#F59E0B",
  "#F472B6",
  "#22D3EE",
];

const EMOJI_OPTIONS = [
  "🎯", "🏠", "✈️", "🚗", "💻", "📱", "🎓", "💍", "🏖️", "🛒",
  "🎸", "🏋️", "🐶", "🌍", "⛵", "🎨", "📚", "💰", "🏦", "🎁",
];

function formatDue(due: string): string {
  try {
    const d = new Date(due);
    return new Intl.DateTimeFormat("it-IT", { month: "short", year: "numeric" }).format(d);
  } catch {
    return due;
  }
}

function GoalsPageContent() {
  const router = useRouter();

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formEmoji, setFormEmoji] = useState("🎯");
  const [formAccent, setFormAccent] = useState(ACCENT_COLORS[0]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saving-goals");
      const data = await res.json();
      if (Array.isArray(data)) {
        setGoals(data);
      } else {
        setGoals([]);
      }
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  function openCreateModal() {
    setEditingGoal(null);
    setFormEmoji("🎯");
    setFormAccent(ACCENT_COLORS[0]);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(goal: SavingGoal) {
    setEditingGoal(goal);
    setFormEmoji(goal.emoji);
    setFormAccent(goal.accent);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingGoal(null);
    setFormError("");
    setSubmitting(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const target = parseFloat(fd.get("target") as string);
    const due = fd.get("due") as string;

    if (!name) { setFormError("Nome richiesto"); setSubmitting(false); return; }
    if (!target || target <= 0) { setFormError("Obiettivo deve essere maggiore di 0"); setSubmitting(false); return; }
    if (!due) { setFormError("Scadenza richiesta"); setSubmitting(false); return; }
    if (new Date(due) <= new Date()) { setFormError("La scadenza deve essere nel futuro"); setSubmitting(false); return; }

    const payload = { name, emoji: formEmoji, target, due, accent: formAccent };

    try {
      const res = await fetch(
        editingGoal ? `/api/saving-goals/${editingGoal.id}` : "/api/saving-goals",
        {
          method: editingGoal ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Errore nel salvataggio");
        setSubmitting(false);
        return;
      }
      closeModal();
      fetchGoals();
    } catch {
      setFormError("Errore di rete");
      setSubmitting(false);
    }
  }

  async function handleDelete(goal: SavingGoal) {
    if (!confirm(`Eliminare "${goal.name}"? Tutti i contributi saranno persi.`)) return;
    try {
      await fetch(`/api/saving-goals/${goal.id}`, { method: "DELETE" });
      fetchGoals();
    } catch {
      // silent
    }
  }

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Obiettivi</h1>
        <button className={styles.addButton} onClick={openCreateModal} aria-label="Nuovo obiettivo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* ── Summary card ── */}
      {goals.length > 0 && (
        <div className={styles.summaryCard}>
          <span className={styles.summaryEyebrow}>TOTALE RISPARMIATO</span>
          <p className={styles.summaryAmount}>{formatCurrency(totalSaved)}</p>
          <p className={styles.summaryTarget}>su {formatCurrency(totalTarget)} pianificati</p>
          {totalTarget > 0 && (
            <div className={styles.summaryTrack}>
              <div
                className={styles.summaryFill}
                style={{ width: `${Math.min(100, (totalSaved / totalTarget) * 100)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <LoadingSpinner />
      ) : goals.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎯</div>
          <p className={styles.emptyTitle}>Nessun obiettivo ancora</p>
          <p className={styles.emptyText}>Crea il tuo primo obiettivo di risparmio</p>
          <button className={styles.emptyButton} onClick={openCreateModal}>
            + Crea obiettivo
          </button>
        </div>
      ) : (
        <div className={styles.goalsList}>
          {goals.map((goal) => {
            const progress = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
            const remaining = Math.max(0, goal.target - goal.saved);
            const isComplete = goal.saved >= goal.target;

            return (
              <div
                key={goal.id}
                className={styles.goalCard}
                onClick={() => router.push(`/goals/${goal.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/goals/${goal.id}`)}
              >
                <div className={styles.goalCardTop}>
                  <div className={styles.goalCardLeft}>
                    <div
                      className={styles.goalCardIcon}
                      style={{
                        background: goal.accent + "38",
                        border: `1px solid ${goal.accent}55`,
                      }}
                    >
                      {goal.emoji}
                    </div>
                    <div className={styles.goalCardInfo}>
                      <p className={styles.goalCardName}>{goal.name}</p>
                      <p className={styles.goalCardDue}>{formatDue(goal.due)}</p>
                    </div>
                  </div>
                  <p
                    className={styles.goalCardPct}
                    style={{ color: isComplete ? "var(--income)" : goal.accent }}
                  >
                    {isComplete ? "✓" : `${Math.round(progress)}%`}
                  </p>
                </div>

                <div className={styles.goalTrack}>
                  <div
                    className={styles.goalFill}
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${goal.accent}, ${goal.accent}CC)`,
                    }}
                  />
                </div>

                <div className={styles.goalCardFooter}>
                  <span className={styles.goalCardSaved}>
                    {formatCurrency(goal.saved)}
                  </span>
                  <span className={styles.goalCardOf}>
                    di {formatCurrency(goal.target)}
                  </span>
                  {!isComplete && (
                    <span className={styles.goalCardRemaining}>
                      mancano {formatCurrency(remaining)}
                    </span>
                  )}
                  {isComplete && (
                    <span className={styles.goalCardComplete}>Completato!</span>
                  )}
                </div>

                {/* Actions (stop propagation so card click doesn't fire) */}
                <div
                  className={styles.goalCardActions}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={styles.goalActionBtn}
                    onClick={() => openEditModal(goal)}
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    className={`${styles.goalActionBtn} ${styles.goalActionDelete}`}
                    onClick={() => handleDelete(goal)}
                    title="Elimina"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: new/edit goal ── */}
      {showModal && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalGrabber} />
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingGoal ? "Modifica obiettivo" : "Nuovo obiettivo"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} className={styles.form}>

                {/* Emoji picker */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Icona</label>
                  <div className={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className={`${styles.emojiButton} ${formEmoji === em ? styles.emojiButtonActive : ""}`}
                        style={formEmoji === em ? { borderColor: formAccent, background: formAccent + "22" } : {}}
                        onClick={() => setFormEmoji(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="name">Nome obiettivo</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={styles.input}
                    placeholder="es. Vacanza in Giappone"
                    defaultValue={editingGoal?.name || ""}
                    required
                    maxLength={50}
                  />
                </div>

                {/* Target */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="target">Obiettivo (€)</label>
                  <input
                    id="target"
                    name="target"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={styles.input}
                    placeholder="0.00"
                    defaultValue={editingGoal?.target || ""}
                    required
                  />
                </div>

                {/* Due date */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="due">Scadenza</label>
                  <input
                    id="due"
                    name="due"
                    type="date"
                    className={styles.input}
                    defaultValue={
                      editingGoal?.due
                        ? editingGoal.due.split("T")[0]
                        : ""
                    }
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    required
                  />
                </div>

                {/* Accent color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Colore</label>
                  <div className={styles.colorRow}>
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`${styles.colorSwatch} ${formAccent === color ? styles.colorSwatchActive : ""}`}
                        style={{ background: color }}
                        onClick={() => setFormAccent(color)}
                        aria-label={`Colore ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {formError && <p className={styles.formError}>{formError}</p>}

                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelButton} onClick={closeModal}>
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    style={{ background: formAccent }}
                    disabled={submitting}
                  >
                    {submitting ? "..." : editingGoal ? "Salva" : "Crea obiettivo"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GoalsPageContent />
    </Suspense>
  );
}
