import { create } from "zustand";

/** The workspace balance as the browser last knew it. The generation hook
    writes it on every debit and refund; the sidebar reads it, so the two
    places that show credits never disagree. Seeded from the server on each
    page, never persisted. */
type CreditsState = {
  balance: number | null;
  set: (balance: number | null) => void;
  adjust: (delta: number) => void;
};

export const useCredits = create<CreditsState>()((set) => ({
  balance: null,
  set: (balance) => set((state) => (state.balance === balance ? state : { balance })),
  adjust: (delta) =>
    set((state) => (state.balance === null ? state : { balance: Math.max(0, state.balance + delta) })),
}));
