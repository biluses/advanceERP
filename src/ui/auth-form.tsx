"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signIn, signUp } from "@/auth/client";

export function AuthForm({
  mode,
  next = "/app",
  canReset = false,
}: {
  mode: "login" | "register";
  next?: string;
  /* Shown only when the studio can actually send the email. */
  canReset?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "register"
        ? await signUp.email({ name: name.trim() || email.split("@")[0]!, email: email.trim(), password })
        : await signIn.email({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form className="vt-auth-form" onSubmit={(event) => void onSubmit(event)}>
      <h1 className="vt-auth-title">{mode === "register" ? "Create your studio" : "Welcome back"}</h1>
      <p className="vt-auth-copy">
        {mode === "register"
          ? "A workspace, a brand kit and 30 trial credits are waiting on the other side."
          : "Sign in to your workspace."}
      </p>

      {mode === "register" && (
        <label className="vt-field">
          <span className="vt-field-label">Your name</span>
          <input className="vt-input" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      )}
      <label className="vt-field">
        <span className="vt-field-label">Email</span>
        <input
          className="vt-input"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="vt-field">
        <span className="vt-field-label">Password</span>
        <input
          className="vt-input"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {error && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-text">{error}</span>
        </div>
      )}

      <button type="submit" className="vt-cta vt-auth-submit" disabled={busy}>
        {busy ? "One moment…" : mode === "register" ? "Create account" : "Sign in"}
      </button>

      {mode === "login" && canReset && (
        <p className="vt-auth-switch">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      )}

      <p className="vt-auth-switch">
        {mode === "register" ? (
          <>
            Already have an account? <Link href={next === "/app" ? "/login" : `/login?next=${encodeURIComponent(next)}`}>Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href={next === "/app" ? "/register" : `/register?next=${encodeURIComponent(next)}`}>Create your studio</Link>
          </>
        )}
      </p>
    </form>
  );
}
