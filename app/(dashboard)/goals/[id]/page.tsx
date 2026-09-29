"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatCurrency, formatDate } from "@/lib/utils/format";
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
    return new Intl.DateTimeFormat("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return due;
  }
}

function GoalDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const goalId = params.id;

  const [goal, setGoal] = useState<SavingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modals
  const [showContribModal, setShowContribModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Contribution form
  const [contribAmount, setContribAmount] = useState("");
  const [contribNote, setContribNote] = useState("");
  const [contribDate, setContribDate] = useState(new Date().toISOString().split("T")[0]);
  const [contribError, setContribError] = useState("");
  const [contribSubmitting, setContribSubmitting] = useState(false);

  // Edit form
  const [formEmoji, setFormEmoji] = useState("🎯");
  const [formAccent, setFormAccent] = useState(ACCENT_COLORS[0]);
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchGoal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/saving-goals/${goalId}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setGoal(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  function openEditModal() {
    if (!goal) return;
    setFormEmoji(goal.emoji);
    setFormAccent(goal.accent);
    setEditError("");
    setShowEditModal(true);
  }

  function openContribModal() {
    setContribAmount("");
    setContribNote("");
    setContribDate(new Date().toISOString().split("T")[0]);
    setContribError("");
    setShowContribModal(true);
  }

  async function handleAddContribution(e: React.FormEvent) {
    e.preventDefault();
    setContribError("");
    setContribSubmitting(true);

    const amount = parseFloat(contribAmount);
    if (!amount || amount <= 0) {
      setContribError("Importo non valido");
      setContribSubmitting(false);
      return;
    }

    // Optimistic update
    const prevGoal = goal;
    if (goal) {
      setGoal({
        ...goal,
        saved: goal.saved + amount,
        contributions: [
          {
            id: "optimistic-" + Date.now(),
            amount,
            date: contribDate,
            note: contribNote || null,
            createdAt: new Date().toISOString(),
          },
          ...goal.contributions,
        ],
      });
    }
    setShowContribModal(false);

    try {
      const res = await fetch(`/api/saving-goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, date: contribDate, note: contribNote || undefined }),
      });

      if (!res.ok) {
        // Rollback
        setGoal(prevGoal);
        setShowContribModal(true);
        const data = await res.json();
        setContribError(data.error || "Errore nell'aggiunta del contributo");
      } else {
        // Refresh with real data
        fetchGoal();
      }
    } catch {
      setGoal(prevGoal);
      setShowContribModal(true);
      setContribError("Errore di rete");
    } finally {
      setContribSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!goal) return;
    setEditError("");
    setEditSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string).trim();
    const target = parseFloat(fd.get("target") as string);
    const due = fd.get("due") as string;

    if (!name) { setEditError("Nome richiesto"); setEditSubmitting(false); return; }
    if (!target || target <= 0) { setEditError("Obiettivo deve essere > 0"); setEditSubmitting(false); return; }
    if (!due) { setEditError("Scadenza richiesta"); setEditSubmitting(false); return; }

    try {
      const res = await fetch(`/api/saving-goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, emoji: formEmoji, target, due, accent: formAccent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Errore nel salvataggio");
        setEditSubmitting(false);
        return;
      }
      setGoal(data);
      setShowEditModal(false);
    } catch {
      setEditError("Errore di rete");
      setEditSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    if (!confirm(`Eliminare "${goal.name}"? Tutti i contributi saranno persi.`)) return;
    await fetch(`/api/saving-goals/${goalId}`, { method: "DELETE" });
    router.push("/goals");
  }

  if (loading) return <LoadingSpinner />;

  if (notFound || !goal) {
    return (
      <div className={styles.notFound}>
        <p>Obiettivo non trovato</p>
        <button className={styles.backLink} onClick={() => router.push("/goals")}>
          ← Torna agli obiettivi
        </button>
      </div>
    );
  }

  const progress = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.saved);
  const isComplete = goal.saved >= goal.target;

  return (
    <div className={styles.page}>
      {/* ── Back ── */}
      <button className={styles.backButton} onClick={() => router.push("/goals")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Obiettivi
      </button>

      {/* ── Hero ── */}
      <div className={styles.hero} style={{ borderColor: goal.accent + "33" }}>
        <div className={styles.heroTop}>
          <div
            className={styles.heroIcon}
            style={{ background: goal.accent + "33", border: `1.5px solid ${goal.accent}55` }}
          >
            {goal.emoji}
          </div>
          <div className={styles.heroActions}>
            <button className={styles.heroActionBtn} onClick={openEditModal} title="Modifica">
              ✏️
            </button>
            <button className={`${styles.heroActionBtn} ${styles.heroActionDelete}`} onClick={handleDelete} title="Elimina">
              🗑️
            </button>
          </div>
        </div>

        <h1 className={styles.heroName}>{goal.name}</h1>
        <p className={styles.heroDue}>Scadenza: {formatDue(goal.due)}</p>

        <div className={styles.heroPctRow}>
          <span
            className={styles.heroPct}
            style={{ color: isComplete ? "var(--income)" : goal.accent }}
          >
            {isComplete ? "✓ Completato!" : `${Math.round(progress)}%`}
          </span>
          <span className={styles.heroRemaining}>
            {isComplete ? "" : `mancano ${formatCurrency(remaining)}`}
          </span>
        </div>

        <div className={styles.heroTrack}>
          <div
            className={styles.heroFill}
            style={{
              width: `${progress}%`,
              background: isComplete
                ? "var(--income)"
                : `linear-gradient(90deg, ${goal.accent}, ${goal.accent}CC)`,
            }}
          />
        </div>

        <div className={styles.heroAmounts}>
          <div className={styles.heroAmountBlock}>
            <span className={styles.heroAmountLabel}>RISPARMIATO</span>
            <span className={styles.heroAmountValue} style={{ color: goal.accent }}>
              {formatCurrency(goal.saved)}
            </span>
          </div>
          <div className={styles.heroAmountDivider} />
          <div className={styles.heroAmountBlock}>
            <span className={styles.heroAmountLabel}>OBIETTIVO</span>
            <span className={styles.heroAmountValue}>{formatCurrency(goal.target)}</span>
          </div>
        </div>
      </div>

      {/* ── Add contribution button ── */}
      {!isComplete && (
        <button
          className={styles.addContribButton}
          style={{ background: goal.accent }}
          onClick={openContribModal}
        >
          + Aggiungi al goal
        </button>
      )}
      {isComplete && (
        <div className={styles.completeBanner}>
          🎉 Obiettivo raggiunto!
        </div>
      )}

      {/* ── Contributions ── */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>CONTRIBUTI</span>
          <span className={styles.sectionCount}>{goal.contributions.length}</span>
        </div>

        {goal.contributions.length === 0 ? (
          <div className={styles.contribEmpty}>
            <p>Nessun contributo ancora</p>
            {!isComplete && (
              <button className={styles.contribEmptyBtn} onClick={openContribModal}>
                Aggiungi il primo
              </button>
            )}
          </div>
        ) : (
          <div className={styles.contribList}>
            {goal.contributions.map((c, idx) => (
              <div
                key={c.id}
                className={styles.contribRow}
                style={idx === goal.contributions.length - 1 ? { borderBottom: "none" } : {}}
              >
                <div
                  className={styles.contribDot}
                  style={{ background: goal.accent }}
                />
                <div className={styles.contribInfo}>
                  <p className={styles.contribNote}>{c.note || "Versamento"}</p>
                  <p className={styles.contribDate}>{formatDate(c.date, "long")}</p>
                </div>
                <span className={styles.contribAmount} style={{ color: goal.accent }}>
                  +{formatCurrency(c.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add contribution modal ── */}
      {showContribModal && (
        <div className={styles.modal} onClick={() => setShowContribModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalGrabber} />
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Aggiungi al goal</h2>
              <button className={styles.closeButton} onClick={() => setShowContribModal(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleAddContribution} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Importo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className={styles.input}
                    placeholder="0.00"
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Data</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={contribDate}
                    onChange={(e) => setContribDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nota (opzionale)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="es. Bonus lavoro"
                    value={contribNote}
                    onChange={(e) => setContribNote(e.target.value)}
                    maxLength={80}
                  />
                </div>

                {contribError && <p className={styles.formError}>{contribError}</p>}

                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowContribModal(false)}>
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    style={{ background: goal.accent }}
                    disabled={contribSubmitting}
                  >
                    {contribSubmitting ? "..." : "Aggiungi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ── */}
      {showEditModal && (
        <div className={styles.modal} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalGrabber} />
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Modifica obiettivo</h2>
              <button className={styles.closeButton} onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleEditSubmit} className={styles.form}>
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

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome</label>
                  <input name="name" type="text" className={styles.input} defaultValue={goal.name} required maxLength={50} />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Obiettivo (€)</label>
                  <input name="target" type="number" step="0.01" min="0.01" className={styles.input} defaultValue={goal.target} required />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Scadenza</label>
                  <input
                    name="due"
                    type="date"
                    className={styles.input}
                    defaultValue={goal.due.split("T")[0]}
                    required
                  />
                </div>

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

                {editError && <p className={styles.formError}>{editError}</p>}

                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelButton} onClick={() => setShowEditModal(false)}>
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    style={{ background: formAccent }}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? "..." : "Salva"}
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

export default function GoalDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <GoalDetailContent />
    </Suspense>
  );
}
