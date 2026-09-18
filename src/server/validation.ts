export type SaveResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** One message per field, the first issue winning, keyed the way a form
    names its inputs. */
export function flatten(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
