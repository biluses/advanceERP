export class MissingCredentialsError extends Error {
  constructor() {
    super("Missing platform key");
    this.name = "MissingCredentialsError";
  }
}

/** Who pays the platform for a run. "operator" is the SaaS default — the
    installation's own key, metered in credits. "byok" is a workspace that
    brought its own key and is not charged credits. */
export type KeyMode = "operator" | "byok" | "none";

export function parseCredentialInput(data: unknown): { apiKey: string } {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Enter an API key");
  }
  const record = data as { apiKey?: unknown; api_key?: unknown };
  const apiKey = record.apiKey ?? record.api_key;
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("Enter an API key");
  return { apiKey: requireIdAndSecret(apiKey.trim()) };
}

export function toAuthorizationHeader(apiKey: string): string {
  return `Key ${requireIdAndSecret(apiKey)}`;
}

export function requireIdAndSecret(apiKey: string): string {
  const colon = apiKey.indexOf(":");
  if (colon <= 0 || colon === apiKey.length - 1) {
    throw new Error("API key must be id:secret");
  }
  return apiKey;
}

/** The installation's own platform key, if the operator set one. */
export function operatorKey(): string | null {
  const key = process.env.PLATFORM_API_KEY?.trim();
  if (!key) return null;
  try {
    return requireIdAndSecret(key);
  } catch {
    return null;
  }
}

export function platformBaseUrl(): string {
  const baseUrl = process.env.HF_API_BASE_URL?.trim();
  if (!baseUrl) throw new Error("Missing HF_API_BASE_URL");
  return baseUrl;
}
