"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import styles from "./page.module.css";

interface User {
  id: string;
  name: string | null;
  email: string;
  currency: string;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string;
  isDefault: boolean;
}

const currencies = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollaro USA ($)" },
  { value: "GBP", label: "Sterlina (£)" },
  { value: "CHF", label: "Franco svizzero (CHF)" },
];

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366f1");

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, categoriesRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/categories"),
      ]);
      const [profileData, categoriesData] = await Promise.all([
        profileRes.json(),
        categoriesRes.json(),
      ]);
      setUser(profileData);
      setCategories(categoriesData);
    } catch (err) {
      console.error("Errore nel caricamento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      currency: formData.get("currency") as string,
    };

    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;

    if (newPassword) {
      data.currentPassword = currentPassword;
      data.newPassword = newPassword;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
      } else {
        setUser(result);
        setSuccess("Profilo aggiornato con successo");
        // Clear password fields
        const form = e.currentTarget;
        (form.elements.namedItem("currentPassword") as HTMLInputElement).value = "";
        (form.elements.namedItem("newPassword") as HTMLInputElement).value = "";
      }
    } catch {
      setError("Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName,
          color: newCategoryColor,
        }),
      });

      if (response.ok) {
        setNewCategoryName("");
        fetchData();
      }
    } catch (err) {
      console.error("Errore nella creazione:", err);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Sei sicuro di voler eliminare questa categoria?")) return;

    try {
      await fetch(`/api/categories/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error("Errore nell'eliminazione:", err);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Profilo</h1>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Informazioni personali</h2>
          </div>
          <div className={styles.cardContent}>
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              {success && <div className={styles.success}>{success}</div>}
              {error && <div className={styles.error}>{error}</div>}

              <Input
                name="name"
                type="text"
                label="Nome"
                defaultValue={user?.name || ""}
              />

              <Input
                name="email"
                type="email"
                label="Email"
                defaultValue={user?.email || ""}
              />

              <div className={styles.formGroup}>
                <label className={styles.label}>Valuta</label>
                <select
                  name="currency"
                  className={styles.select}
                  defaultValue={user?.currency || "EUR"}
                >
                  {currencies.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </form>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Cambia password</h2>
          </div>
          <div className={styles.cardContent}>
            <form onSubmit={handleProfileSubmit} className={styles.form}>
              <Input
                name="currentPassword"
                type="password"
                label="Password attuale"
                placeholder="••••••••"
              />

              <Input
                name="newPassword"
                type="password"
                label="Nuova password"
                placeholder="••••••••"
                minLength={6}
              />

              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : "Aggiorna password"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Categorie</h2>
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <div key={category.id} className={styles.categoryItem}>
              <div className={styles.categoryInfo}>
                <div
                  className={styles.categoryIcon}
                  style={{ backgroundColor: category.color + "20" }}
                >
                  {category.icon || "📦"}
                </div>
                <span className={styles.categoryName}>
                  {category.name}
                  {category.isDefault && (
                    <span className={styles.categoryBadge}>Predefinita</span>
                  )}
                </span>
              </div>
              {!category.isDefault && (
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteCategory(category.id)}
                  title="Elimina"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
          <form onSubmit={handleAddCategory} className={styles.addCategory}>
            <input
              type="text"
              placeholder="Nuova categoria..."
              className={styles.addCategoryInput}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <input
              type="color"
              className={styles.colorInput}
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
            />
            <Button type="submit" size="small">
              Aggiungi
            </Button>
          </form>
        </div>
      </div>

      <div className={styles.logoutSection}>
        <button
          className={styles.logoutButton}
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Esci dall&apos;account
        </button>
      </div>
    </div>
  );
}
