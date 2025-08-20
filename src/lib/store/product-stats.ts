// src/lib/store/product-stats.ts
"use client";

import { create } from "zustand";
import { useEffect } from "react";

type Status = "idle" | "loading" | "success" | "error";
type Range = { min: number; max: number };

type ProductStatsPayload = {
    minPrice: number;
    maxPrice: number;
    categories?: string[];
    brands?: string[];

    ramValues?: number[];
    storageValues?: number[];
    screen?: Range;
    battery?: Range;
    weight?: Range;

    cpuValues?: string[];
};

type ProductStatsState = {
    // Backend özetleri
    minPrice: number | null;
    maxPrice: number | null;
    categories: string[];
    brands: string[];

    // yeni alanlar
    ramValues: number[];
    storageValues: number[];
    screen: Range | null;
    battery: Range | null;
    weight: Range | null;

    cpuValues: string[];

    // Durum
    status: Status;
    error?: string;

    // Actions
    fetchStats: () => Promise<void>;
    reset: () => void;
};

const strCollator = new Intl.Collator("tr", { sensitivity: "base", numeric: true });

export const useProductStats = create<ProductStatsState>((set, get) => ({
    minPrice: null,
    maxPrice: null,
    categories: [],
    brands: [],

    ramValues: [],
    storageValues: [],
    screen: null,
    battery: null,
    weight: null,

    cpuValues: [],

    status: "idle",
    error: undefined,

    async fetchStats() {
        const { status } = get();
        if (status === "loading" || status === "success") return; // idempotent

        set({ status: "loading", error: undefined });
        try {
            const res = await fetch("/api/products/stats", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data: ProductStatsPayload = await res.json();

            const safeNum = (v: unknown, def = 0) =>
                typeof v === "number" && Number.isFinite(v) ? v : def;

            const safeRange = (r: unknown): Range | null => {
                if (!r || typeof r !== "object") return null;
                const rr = r as Record<string, unknown>;
                const min = safeNum(rr.min, 0);
                const max = safeNum(rr.max, 0);
                return { min, max };
            };

            const safeCpuValues = Array.isArray(data.cpuValues)
                ? Array.from(
                    new Set(
                        data.cpuValues
                            .filter((s): s is string => typeof s === "string")
                            .map((s) => s.trim())
                            .filter((s) => s && s !== "—")
                    )
                ).sort((a, b) => strCollator.compare(a, b))
                : [];

            set({
                minPrice: safeNum(data.minPrice, 0),
                maxPrice: safeNum(data.maxPrice, 0),
                categories: Array.isArray(data.categories) ? data.categories : [],
                brands: Array.isArray(data.brands) ? data.brands : [],

                ramValues: Array.isArray(data.ramValues)
                    ? Array.from(new Set(data.ramValues.filter((n) => typeof n === "number"))).sort(
                        (a, b) => a - b
                    )
                    : [],
                storageValues: Array.isArray(data.storageValues)
                    ? Array.from(new Set(data.storageValues.filter((n) => typeof n === "number"))).sort(
                        (a, b) => a - b
                    )
                    : [],
                screen: safeRange(data.screen),
                battery: safeRange(data.battery),
                weight: safeRange(data.weight),

                cpuValues: safeCpuValues,

                status: "success",
                error: undefined,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Beklenmeyen bir hata";
            set({ status: "error", error: message });
        }
    },

    reset() {
        set({
            minPrice: null,
            maxPrice: null,
            categories: [],
            brands: [],
            ramValues: [],
            storageValues: [],
            screen: null,
            battery: null,
            weight: null,

            cpuValues: [],

            status: "idle",
            error: undefined,
        });
    },
}));


export function useEnsureProductStats() {
    const status = useProductStats((s) => s.status);
    const fetchStats = useProductStats((s) => s.fetchStats);

    useEffect(() => {
        if (status === "idle") {
            fetchStats();
        }
    }, [status, fetchStats]);
}
