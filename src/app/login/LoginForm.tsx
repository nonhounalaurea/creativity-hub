"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function messageFor(error: { message: string; status?: number }) {
  const m = error.message.toLowerCase();
  if (m.includes("invalid login credentials")) return "email o password non corrette";
  if (m.includes("email not confirmed")) return "l'utente non è ancora confermato";
  if (error.status === 429 || m.includes("rate limit")) return "troppi tentativi, riprova tra poco";
  if (m.includes("fetch") || m.includes("network")) return "connessione non riuscita, riprova";
  return "impossibile accedere, riprova";
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setError(messageFor(error));
        setBusy(false);
        return;
      }
      router.replace("/create");
      router.refresh();
    } catch {
      setError("connessione non riuscita, riprova");
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="login-form">
      <label className="block text-sm text-muted">
        email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
          data-testid="login-email"
        />
      </label>
      <label className="block text-sm text-muted">
        password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          data-testid="login-password"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-red-400" data-testid="login-error">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg border border-accent px-3 py-2 text-sm font-medium text-accent hover:bg-surface disabled:opacity-50"
        data-testid="login-submit"
      >
        {busy ? "accesso in corso..." : "entra"}
      </button>
    </form>
  );
}
