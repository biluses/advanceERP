"use client";

import { useState, type FormEvent } from "react";

import { PLANS, formatPrice, getPlan } from "@/domain/plans";
import { clearPlatformCredentials, savePlatformCredentials, type KeyStatus } from "@/generation/actions";
import { openBillingPortal, startCheckout, type LedgerEntry, type WorkspaceSummary } from "@/server/actions/billing";

const REASONS: Record<string, string> = {
  trial: "Welcome credits",
  plan_grant: "Plan credits",
  purchase: "Purchase",
  generation: "Generation",
  refund: "Refund",
  adjustment: "Adjustment",
};

const WHEN = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function PlanPanel({ summary, canEdit, checkout }: { summary: WorkspaceSummary; canEdit: boolean; checkout: string | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = getPlan(summary.planId);

  async function go(action: () => Promise<{ url: string }>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const { url } = await action();
      window.location.assign(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
      setBusy(null);
    }
  }

  return (
    <section className="vt-panel">
      <header className="vt-panel-head">
        <h2 className="vt-panel-title">Plan &amp; credits</h2>
        <p className="vt-panel-copy">
          {summary.byok
            ? "This workspace generates on its own platform key, so credits are not charged."
            : "One credit is one standard image; video is priced per second and resolution."}
        </p>
      </header>

      {checkout === "success" && (
        <div className="vt-alert vt-alert--ok" role="status">
          <span className="vt-alert-text">Thanks — your plan is active. Credits land as soon as Stripe confirms the payment.</span>
        </div>
      )}
      {checkout === "canceled" && (
        <div className="vt-alert" role="status">
          <span className="vt-alert-text">Checkout was canceled. Nothing changed.</span>
        </div>
      )}

      <dl className="vt-stats">
        <div>
          <dt>Current plan</dt>
          <dd>{current.label}</dd>
        </div>
        <div>
          <dt>Credits</dt>
          <dd>{summary.credits.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Renews</dt>
          <dd>{summary.planRenewsAt ? WHEN.format(summary.planRenewsAt) : "—"}</dd>
        </div>
      </dl>

      <ul className="vt-plans vt-plans--compact">
        {PLANS.filter((plan) => plan.id !== "free").map((plan) => (
          <li key={plan.id} className="vt-plan" data-featured={plan.id === current.id || undefined}>
            <h3>{plan.label}</h3>
            <p className="vt-plan-price">
              {formatPrice(plan.priceCents)}
              <span> / month</span>
            </p>
            <p className="vt-plan-blurb">
              {plan.credits.toLocaleString()} credits / month · {plan.seats} seats
            </p>
            {plan.id === current.id ? (
              <span className="vt-chip">Current plan</span>
            ) : (
              <button
                type="button"
                className="vt-btn-solid"
                disabled={!canEdit || !summary.billing || busy !== null}
                title={!summary.billing ? "Billing is not configured on this studio" : undefined}
                onClick={() => void go(() => startCheckout(plan.id), plan.id)}
              >
                {busy === plan.id ? "Opening…" : summary.hasSubscription ? `Switch to ${plan.label}` : `Start ${plan.label}`}
              </button>
            )}
          </li>
        ))}
      </ul>

      {!summary.billing && (
        <p className="vt-panel-note">
          Billing is not configured on this studio. Set <code>STRIPE_SECRET_KEY</code>, the price ids and the webhook secret to sell plans, or
          grant credits directly with <code>pnpm credits</code>.
        </p>
      )}
      {summary.billing && summary.hasSubscription && canEdit && (
        <button type="button" className="vt-btn-quiet" disabled={busy !== null} onClick={() => void go(openBillingPortal, "portal")}>
          {busy === "portal" ? "Opening…" : "Manage billing, invoices and cancellation"}
        </button>
      )}
      {error && (
        <div className="vt-alert" role="alert">
          <span className="vt-alert-text">{error}</span>
        </div>
      )}
    </section>
  );
}

export function KeyPanel({ initial }: { initial: KeyStatus }) {
  const [status, setStatus] = useState(initial);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setStatus(await savePlatformCredentials({ api_key: apiKey }));
      setApiKey("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the key");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await clearPlatformCredentials());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the key");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vt-panel">
      <header className="vt-panel-head">
        <h2 className="vt-panel-title">Platform key</h2>
        <p className="vt-panel-copy">
          {status.byok
            ? "Runs use this workspace's own Higgsfield platform key. No credits are charged."
            : status.mode === "operator"
              ? "Runs use the studio's key and are charged in credits. Bring your own key to generate on your own platform account instead."
              : "No platform key is configured on this studio. Add your Higgsfield platform key to generate."}
        </p>
      </header>
      {status.canEdit ? (
        <form className="vt-form" onSubmit={(event) => void onSubmit(event)}>
          <label className="vt-field">
            <span className="vt-field-label">{status.byok ? "Replace key" : "Your key"} (id:secret)</span>
            <input
              className="vt-input vt-input--mono"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <span className="vt-field-hint">Sealed at rest with the studio secret; only ever sent to the platform as an Authorization header.</span>
          </label>
          {error && (
            <div className="vt-alert" role="alert">
              <span className="vt-alert-text">{error}</span>
            </div>
          )}
          <div className="vt-form-actions">
            {status.byok && (
              <button type="button" className="vt-btn-quiet" disabled={busy} onClick={() => void onClear()}>
                Remove key
              </button>
            )}
            <span className="vt-form-spacer" />
            <button type="submit" className="vt-cta" disabled={busy || !apiKey.trim()}>
              {busy ? "Saving…" : status.byok ? "Replace key" : "Save key"}
            </button>
          </div>
        </form>
      ) : (
        <p className="vt-panel-note">Only the workspace owner can change the platform key.</p>
      )}
    </section>
  );
}

export function LedgerPanel({ entries }: { entries: LedgerEntry[] }) {
  return (
    <section className="vt-panel">
      <header className="vt-panel-head">
        <h2 className="vt-panel-title">Credit history</h2>
      </header>
      {entries.length === 0 ? (
        <p className="vt-panel-note">Nothing yet.</p>
      ) : (
        <table className="vt-table">
          <thead>
            <tr>
              <th>When</th>
              <th>What</th>
              <th className="vt-num">Credits</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{WHEN.format(entry.createdAt)}</td>
                <td>
                  {REASONS[entry.reason] ?? entry.reason}
                  {entry.note ? <span className="vt-table-note"> · {entry.note}</span> : null}
                </td>
                <td className="vt-num" data-sign={entry.delta > 0 ? "plus" : "minus"}>
                  {entry.delta > 0 ? "+" : ""}
                  {entry.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
