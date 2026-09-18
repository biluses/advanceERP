"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/auth/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: "/reset-password" });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "Could not send the email");
      return;
    }
    setSent(true);
  }

  return (
    <form className="vt-auth-form" onSubmit={(event) => void onSubmit(event)}>
      <h1 className="vt-auth-title">Reset your password</h1>
      <p className="vt-auth-copy">{sent ? "If that address has an account, a reset link is on its way. It works for one hour." : "Enter your email and we will send a link."}</p>
      {!sent && (
        <>
          <label className="vt-field">
            <span className="vt-field-label">Email</span>
            <input className="vt-input" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {error && (
            <div className="vt-alert" role="alert">
              <span className="vt-alert-text">{error}</span>
            </div>
          )}
          <button type="submit" className="vt-cta vt-auth-submit" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </>
      )}
      <p className="vt-auth-switch">
        <Link href="/login">Back to sign in</Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "This link is no longer valid");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return (
      <div className="vt-auth-form">
        <h1 className="vt-auth-title">Link not valid</h1>
        <p className="vt-auth-copy">This reset link is missing its token. Request a new one.</p>
        <Link href="/forgot-password" className="vt-cta vt-auth-submit">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form className="vt-auth-form" onSubmit={(event) => void onSubmit(event)}>
      <h1 className="vt-auth-title">Choose a new password</h1>
      <label className="vt-field">
        <span className="vt-field-label">New password</span>
        <input
          className="vt-input"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {busy ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
