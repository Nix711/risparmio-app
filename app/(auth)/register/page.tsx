"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "../login/page.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Errore durante la registrazione");
      } else {
        router.push("/login");
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Registrati" description="Crea un nuovo account" />
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <Input
            name="name"
            type="text"
            label="Nome"
            placeholder="Il tuo nome"
            required
          />
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="nome@email.com"
            required
          />
          <Input
            name="password"
            type="password"
            label="Password"
            placeholder="••••••••"
            minLength={6}
            required
          />
          <Input
            name="confirmPassword"
            type="password"
            label="Conferma Password"
            placeholder="••••••••"
            required
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Registrazione..." : "Registrati"}
          </Button>
        </form>
        <p className={styles.footer}>
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </CardContent>
    </Card>
  );
}
