"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { clearPlatformCredentials, savePlatformCredentials, type KeyStatus } from "@/generation/actions";

import { CloseIcon } from "./icons";

export function KeyModal({
  status,
  onClose,
  onChange,
}: {
  status: KeyStatus;
  onClose: () => void;
  onChange: (next: KeyStatus) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.showModal();
    panelRef.current?.focus();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onChange(await savePlatformCredentials({ api_key: apiKey }));
      onClose();
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
      onChange(await clearPlatformCredentials());
      setApiKey("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the key");
    } finally {
      setBusy(false);
    }
  }

  const copy = status.byok
    ? "This workspace generates on its own platform key and is not charged credits. Paste a new id:secret pair to replace it, or remove it to go back to the studio's key."
    : status.mode === "operator"
      ? "Runs are billed in credits on the studio's key. Bring your own Higgsfield platform key (id:secret) to generate on your own account instead — no credits are charged."
      : "No platform key is configured for this studio. Paste your Higgsfield platform key as id:secret to generate. It is sealed at rest and only ever sent as Authorization: Key id:secret.";

  return (
    <dialog
      ref={ref}
      aria-labelledby="vt-keys-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className="vt-dialog-panel vt-keys-panel">
        <div className="vt-keys-head">
          <div>
            <div id="vt-keys-title" className="vt-keys-title">
              Platform key
            </div>
            <p className="vt-keys-copy">{copy}</p>
          </div>
          <button type="button" className="vt-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={13} />
          </button>
        </div>

        {status.canEdit ? (
          <form className="vt-keys-form" onSubmit={(event) => void onSubmit(event)}>
            <label className="vt-field">
              <div className="vt-field-label">API key</div>
              <input
                className="vt-input vt-input--mono"
                name="api_key"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>

            {error && (
              <div className="vt-alert" role="alert">
                <span className="vt-alert-text">{error}</span>
              </div>
            )}

            <div className="vt-keys-actions">
              {status.byok && (
                <button type="button" className="vt-btn-quiet" disabled={busy} onClick={() => void onClear()}>
                  Remove key
                </button>
              )}
              <button type="submit" className="vt-keys-save" disabled={busy || !apiKey.trim()}>
                {busy ? "Saving…" : status.byok ? "Replace key" : "Save key"}
              </button>
            </div>
          </form>
        ) : (
          <p className="vt-keys-copy">Only the workspace owner can change the platform key.</p>
        )}
      </div>
    </dialog>
  );
}
