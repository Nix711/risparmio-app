"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email o password non validi");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Si è verificato un errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Accedi" description="Inserisci le tue credenziali" />
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
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
            required
          />
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? "Accesso in corso..." : "Accedi"}
          </Button>
        </form>
        <p className={styles.footer}>
          Non hai un account? <Link href="/register">Registrati</Link>
        </p>
      </CardContent>
    </Card>
  );
}
