// src/lib/store/favorites.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage, subscribeWithSelector } from "zustand/middleware";

type FavoriteStore = {
    favorites: string[];
    hasHydrated: boolean;
    toggleFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
    setFavorite: (id: string, value: boolean) => void;
    clear: () => void;
};

const STORAGE_KEY = "favorite-store";
const STORAGE_VERSION = 1;

export const useFavoriteStore = create<FavoriteStore>()(
    subscribeWithSelector(
        persist(
            (set, get) => ({
                favorites: [],
                hasHydrated: false,

                setFavorite: (id, value) => {
                    const cur = new Set(get().favorites);
                    value ? cur.add(id) : cur.delete(id);
                    set({ favorites: [...cur] });
                },

                toggleFavorite: (id) => {
                    const cur = new Set(get().favorites);
                    cur.has(id) ? cur.delete(id) : cur.add(id);
                    set({ favorites: [...cur] });
                },

                isFavorite: (id) => get().favorites.includes(id),

                clear: () => set({ favorites: [] }),
            }),
            {
                name: STORAGE_KEY,
                version: STORAGE_VERSION,

                storage: createJSONStorage(() => localStorage),

                // Sadece favorites'ı persist et diğerleri zaten db kısmına dolack
                partialize: (state) => ({ favorites: state.favorites }),

                onRehydrateStorage: () => () => {
                    useFavoriteStore.setState({ hasHydrated: true });
                },


            }
        )
    )
);

// Seçici yardımcılar kullanmıyorum şuan silinevilir
export function useIsFavorite(id: string) {
    return useFavoriteStore((s) => s.favorites.includes(id));
}

export function useFavoritesHydrated() {
    return useFavoriteStore((s) => s.hasHydrated);
}

// Sekmeler arası senkron
if (typeof window !== "undefined") {
    type PersistEnvelope = { state?: { favorites?: string[] }; version?: number };

    window.addEventListener("storage", (e) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
            const parsed = JSON.parse(e.newValue) as PersistEnvelope;
            const next = parsed?.state?.favorites;
            if (Array.isArray(next)) {
                useFavoriteStore.setState({ favorites: next });
            }
        } catch {
            // ignore
        }
    });
}
