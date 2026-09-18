/** What the studio sells. Prices are in cents of the currency Stripe is set up
    in. The Stripe price ids live in the environment, not here, so the same
    plan table serves test and live mode. */
export type PlanId = "free" | "starter" | "pro" | "studio";

export type Plan = {
  id: PlanId;
  label: string;
  /** Credits granted on activation and on every renewal. */
  credits: number;
  /** Monthly price in cents; 0 for the free tier. */
  priceCents: number;
  seats: number;
  blurb: string;
  features: readonly string[];
};

export const CURRENCY = "eur";

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    label: "Trial",
    credits: 30,
    priceCents: 0,
    seats: 1,
    blurb: "Try the whole studio on a real product.",
    features: ["30 credits once", "Every preset and channel", "1 seat"],
  },
  {
    id: "starter",
    label: "Starter",
    credits: 500,
    priceCents: 2900,
    seats: 2,
    blurb: "A small catalog, refreshed every month.",
    features: ["500 credits / month", "Campaign exports", "2 seats"],
  },
  {
    id: "pro",
    label: "Pro",
    credits: 2000,
    priceCents: 9900,
    seats: 5,
    blurb: "Content for a growing store and its ads.",
    features: ["2,000 credits / month", "Priority generation", "5 seats", "Bring your own key"],
  },
  {
    id: "studio",
    label: "Studio",
    credits: 6000,
    priceCents: 24900,
    seats: 15,
    blurb: "Agencies and multi-brand teams.",
    features: ["6,000 credits / month", "Multiple brands", "15 seats", "Bring your own key"],
  },
];

export function getPlan(id: string | null | undefined): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0]!;
}

export function isPlanId(id: string): id is PlanId {
  return PLANS.some((plan) => plan.id === id);
}

export function formatPrice(cents: number, currency = CURRENCY, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}
