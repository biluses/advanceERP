/** A server action's failure, carried as data. Next.js replaces the message
    of an error thrown from a server action with a generic one in production,
    so a reason the person should read has to travel in the return value. */
export type FailureKind =
  | "auth"
  | "credentials"
  | "credits"
  | "platform-credits"
  | "platform"
  | "input"
  | "unknown";

export type Failure = { error: string; kind: FailureKind };

export function isFailure(value: unknown): value is Failure {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { error?: unknown }).error === "string" &&
    typeof (value as { kind?: unknown }).kind === "string"
  );
}

/** Thrown on the client once a failure comes back, so one catch path handles
    both a transported failure and a network error. */
export class ActionFailedError extends Error {
  readonly kind: FailureKind;
  constructor(failure: Failure) {
    super(failure.error);
    this.name = "ActionFailedError";
    this.kind = failure.kind;
  }
}
