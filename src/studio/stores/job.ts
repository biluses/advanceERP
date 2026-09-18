import { create } from "zustand";
import { persist } from "zustand/middleware";

import { browserStorage } from "@/generation/stores/browser-storage";

/** The job the composer is set up for: which product, which preset, which
    channel. Everything else the studio needs — model, settings, media — is
    derived from these three when they change, and stays editable after. */
type JobState = {
  productId: string | null;
  presetId: string | null;
  channelId: string | null;
  setProduct: (id: string | null) => void;
  setPreset: (id: string | null) => void;
  setChannel: (id: string | null) => void;
};

export const useJob = create<JobState>()(
  persist(
    (set) => ({
      productId: null,
      presetId: null,
      channelId: null,
      setProduct: (productId) => set((state) => (state.productId === productId ? state : { productId })),
      setPreset: (presetId) => set((state) => (state.presetId === presetId ? state : { presetId })),
      setChannel: (channelId) => set((state) => (state.channelId === channelId ? state : { channelId })),
    }),
    {
      name: "vitrina.job.v1",
      storage: browserStorage(),
      partialize: (state) => ({ productId: state.productId, presetId: state.presetId, channelId: state.channelId }),
    },
  ),
);
