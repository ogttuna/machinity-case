// src/state/useCompare.ts
import { create } from "zustand";

type CompareState = {
    enabled: boolean;
    selectedIds: string[];
};

type CompareGet = () => CompareState; //Kullanmıyorum aslında silsem de olt gibi
type CompareSet = (fn: (s: CompareState) => CompareState) => void;

type CompareActions = {
    toggleEnabled: (on?: boolean) => void;
    toggleSelect: (id: string) => boolean;
    clear: () => void;
    isSelected: (id: string) => boolean;
    canSelectMore: () => boolean;
    count: () => number;
};

export const useCompare = create<CompareState & CompareActions>((set, get) => ({
    enabled: false,
    selectedIds: [],

    toggleEnabled: (on) => {
        const { enabled } = get();
        const next = typeof on === "boolean" ? on : !enabled;
        set((s) => ({
            ...s,
            enabled: next,
            selectedIds: next ? s.selectedIds : [], // KAPANIRSa temizlensi n
        }));
    },

    toggleSelect: (id) => {
        const { selectedIds } = get();
        const isSel = selectedIds.includes(id);

        // Zaten seçiliyse çıkarılsn
        if (isSel) {
            set((s) => ({ ...s, selectedIds: s.selectedIds.filter((x) => x !== id) }));
            return true;
        }

        // Seçili değilse eklesin limite de baksın
        if (selectedIds.length >= 2) {
            return false; // UI bu durumda toast gösterebiliro
        }

        set((s) => ({ ...s, selectedIds: [...s.selectedIds, id] }));
        return true;
    },

    clear: () => set((s) => ({ ...s, selectedIds: [] })),

    isSelected: (id) => get().selectedIds.includes(id),

    canSelectMore: () => get().selectedIds.length < 2,

    count: () => get().selectedIds.length,
}));
