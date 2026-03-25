"use client";

import { create } from "zustand";

type AuthStore = {
  lastEmail: string;
  pendingProvider: "google" | null;
  setLastEmail: (email: string) => void;
  setPendingProvider: (provider: "google" | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  lastEmail: "",
  pendingProvider: null,
  setLastEmail: (email) => set({ lastEmail: email }),
  setPendingProvider: (provider) => set({ pendingProvider: provider }),
}));
