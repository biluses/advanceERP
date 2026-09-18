/** Outbound mail is optional. With RESEND_API_KEY and MAIL_FROM set, the
    studio can send password resets; without them the feature is simply
    absent from the UI rather than silently broken. Resend's HTTP API is a
    single POST, so no SDK is needed. */
export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

export async function sendMail(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) throw new Error("Mail is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Mail provider refused the message (${response.status}) ${body.slice(0, 200)}`);
  }
}
