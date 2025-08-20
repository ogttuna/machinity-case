// src/state/useFilters.ts
"use client";

import { create } from "zustand";
import type { SortOption } from "@/lib/sort";
import type { FavoriteFilter } from "@/lib/filter";

export type FilterOptions = {
    categories: string[];
    brands: string[];
    minPrice: number;
    maxPrice: number;

    ramValues?: number[];
    storageValues?: number[];

    cpuValues?: string[];

    screenMin?: number;
    screenMax?: number;
    batteryMin?: number;
    batteryMax?: number;
    weightMin?: number;
    weightMax?: number;
};

type AIRange = { min?: number | null; max?: number | null; exact?: number | null };

export type AIParsedFilters = {
    categories: string[];
    brands: string[];
    price: AIRange;
    ram_gb?: AIRange;
    storage_gb?: AIRange;
    screen_inch?: AIRange;
    battery_wh?: AIRange;
    weight_kg?: AIRange;
    sort?: "price_asc" | "price_desc" | "rating_desc" | "rating_asc" | "alphabetical";
    favorite?: FavoriteFilter;
    cpus?: string[];
};

/* -------------------- yardımcılar ---------------- */
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));
const clamp = (val: number, lo: number, hi: number) => Math.min(Math.max(val, lo), hi);

function sortNums(arr?: number[]) {
    return Array.isArray(arr) ? [...new Set(arr)].sort((a, b) => a - b) : [];
}

const strCollator = new Intl.Collator("tr", { sensitivity: "base", numeric: true });
const sortStrs = (arr?: string[]) =>
    Array.isArray(arr) ? Array.from(new Set(arr)).sort((a, b) => strCollator.compare(a, b)) : [];

function normRange(r?: AIRange): { min?: number; max?: number; exact?: number } {
    if (!r) return {};
    const out: { min?: number; max?: number; exact?: number } = {};
    if (typeof r.min === "number") out.min = r.min;
    if (typeof r.max === "number") out.max = r.max;
    if (typeof r.exact === "number") out.exact = r.exact;
    return out;
}

function toBounds(r?: AIRange, loBound?: number, hiBound?: number): { lo?: number; hi?: number } {
    const { min, max, exact } = normRange(r);

    if (typeof exact === "number") {
        const x = loBound != null && hiBound != null ? clamp(exact, loBound, hiBound) : exact;
        return { lo: x, hi: x };
    }

    let lo = typeof min === "number" ? min : undefined;
    let hi = typeof max === "number" ? max : undefined;

    if (loBound != null && typeof lo === "number") lo = clamp(lo, loBound, hiBound ?? lo);
    if (hiBound != null && typeof hi === "number") hi = clamp(hi, loBound ?? hi, hiBound);

    if (typeof lo === "number" && typeof hi === "number" && lo > hi) {
        return { lo: hi, hi: lo };
    }
    return { lo, hi };
}

function pickDiscreteInRange(values: number[] | undefined, lo?: number, hi?: number): number[] {
    if (!Array.isArray(values) || values.length === 0) return [];
    return values.filter((v) => {
        if (typeof lo === "number" && v < lo) return false;
        if (typeof hi === "number" && v > hi) return false;
        return true;
    });
}

//Kullanmıyorum artık silinevilir
function buildRangeOrSkip(
    lo?: number,
    hi?: number,
    fallbackLo?: number,
    fallbackHi?: number
): [number, number] | undefined {
    if (typeof lo !== "number" && typeof hi !== "number") return undefined;
    const left = typeof lo === "number" ? lo : (fallbackLo as number);
    const right = typeof hi === "number" ? hi : (fallbackHi as number);
    return left <= right ? [left, right] : [right, left];
}

/* -------------------- Zustand State ------------------ */
type FiltersState = {
    options: FilterOptions;
    setOptions: (opts: FilterOptions) => void;

    selectedCategories: string[];
    toggleCategory: (cat: string) => void;
    clearCategories: () => void;

    selectedBrands: string[];
    toggleBrand: (brand: string) => void;
    clearBrands: () => void;

    priceRange: [number, number];
    setPriceRange: (range: [number, number]) => void;

    favoriteFilter: FavoriteFilter;
    setFavoriteFilter: (val: FavoriteFilter) => void;

    sortBy: SortOption;
    setSortBy: (val: SortOption) => void;

    selectedRams: number[];
    toggleRam: (val: number) => void;
    clearRams: () => void;

    selectedStorages: number[];
    toggleStorage: (val: number) => void;
    clearStorages: () => void;

    selectedCpus: string[];
    toggleCpu: (cpu: string) => void;
    clearCpus: () => void;

    screenRange: [number, number];
    setScreenRange: (range: [number, number]) => void;

    batteryRange: [number, number];
    setBatteryRange: (range: [number, number]) => void;

    weightRange: [number, number];
    setWeightRange: (range: [number, number]) => void;

    clearAll: () => void;


    applyFromAI: (pf: AIParsedFilters) => void;
};

export const useFilters = create<FiltersState>((set, get) => ({

    options: { categories: [], brands: [], minPrice: 0, maxPrice: 100_000 },
    setOptions: (opts) =>
        set((s) => ({
            options: {
                categories: uniq(opts.categories),
                brands: uniq(opts.brands),
                minPrice: Math.max(0, opts.minPrice),
                maxPrice: Math.max(opts.minPrice, opts.maxPrice),
                ramValues: sortNums(opts.ramValues),
                storageValues: sortNums(opts.storageValues),
                cpuValues: sortStrs(opts.cpuValues),
                screenMin: opts.screenMin,
                screenMax: opts.screenMax,
                batteryMin: opts.batteryMin,
                batteryMax: opts.batteryMax,
                weightMin: opts.weightMin,
                weightMax: opts.weightMax,
            },

            priceRange:
                s.priceRange[0] === 0 && s.priceRange[1] === 100_000
                    ? ([Math.max(0, opts.minPrice), Math.max(opts.minPrice, opts.maxPrice)] as [number, number])
                    : s.priceRange,
        })),

    selectedCategories: [],
    toggleCategory: (cat) =>
        set((s) => {
            const has = s.selectedCategories.includes(cat);
            return {
                selectedCategories: has ? s.selectedCategories.filter((c) => c !== cat) : [...s.selectedCategories, cat],
            };
        }),
    clearCategories: () => set({ selectedCategories: [] }),

    selectedBrands: [],
    toggleBrand: (brand) =>
        set((s) => {
            const has = s.selectedBrands.includes(brand);
            return {
                selectedBrands: has ? s.selectedBrands.filter((b) => b !== brand) : [...s.selectedBrands, brand],
            };
        }),
    clearBrands: () => set({ selectedBrands: [] }),

    priceRange: [0, 100_000],
    setPriceRange: (range) => set({ priceRange: range }),

    favoriteFilter: "all",
    setFavoriteFilter: (val) => set({ favoriteFilter: val }),

    sortBy: "alphabetical",
    setSortBy: (val) => set({ sortBy: val }),

    selectedRams: [],
    toggleRam: (val) =>
        set((s) => {
            const has = s.selectedRams.includes(val);
            return { selectedRams: has ? s.selectedRams.filter((x) => x !== val) : [...s.selectedRams, val] };
        }),
    clearRams: () => set({ selectedRams: [] }),

    selectedStorages: [],
    toggleStorage: (val) =>
        set((s) => {
            const has = s.selectedStorages.includes(val);
            return { selectedStorages: has ? s.selectedStorages.filter((x) => x !== val) : [...s.selectedStorages, val] };
        }),
    clearStorages: () => set({ selectedStorages: [] }),

    selectedCpus: [],
    toggleCpu: (cpu) =>
        set((s) => {
            const has = s.selectedCpus.includes(cpu);
            return { selectedCpus: has ? s.selectedCpus.filter((x) => x !== cpu) : [...s.selectedCpus, cpu] };
        }),
    clearCpus: () => set({ selectedCpus: [] }),

    screenRange: [0, 0],
    setScreenRange: (range) => set({ screenRange: range }),

    batteryRange: [0, 0],
    setBatteryRange: (range) => set({ batteryRange: range }),

    weightRange: [0, 0],
    setWeightRange: (range) => set({ weightRange: range }),

    clearAll: () =>
        set((s) => {
            const o = s.options;

            const screenRange: [number, number] =
                typeof o.screenMin === "number" && typeof o.screenMax === "number" ? [o.screenMin, o.screenMax] : [0, 0];

            const batteryRange: [number, number] =
                typeof o.batteryMin === "number" && typeof o.batteryMax === "number" ? [o.batteryMin, o.batteryMax] : [0, 0];

            const weightRange: [number, number] =
                typeof o.weightMin === "number" && typeof o.weightMax === "number" ? [o.weightMin, o.weightMax] : [0, 0];

            return {
                selectedCategories: [] as string[],
                selectedBrands: [] as string[],
                selectedRams: [] as number[],
                selectedStorages: [] as number[],
                selectedCpus: [] as string[], // ✅ CPU seçimlerini de sıfırla

                priceRange: [o.minPrice, o.maxPrice] as [number, number],
                screenRange,
                batteryRange,
                weightRange,

                favoriteFilter: "all" as FavoriteFilter,
                sortBy: "alphabetical" as SortOption,
            } satisfies Partial<FiltersState>;
        }),

    applyFromAI: (pf) =>
        set((s) => {
            const o = s.options;

            const base = {
                selectedCategories: [] as string[],
                selectedBrands: [] as string[],
                selectedRams: [] as number[],
                selectedStorages: [] as number[],
                selectedCpus: [] as string[], // ✅ AI CPU gelmezse boş kalır
                priceRange: [o.minPrice, o.maxPrice] as [number, number],
                screenRange: [o.screenMin ?? 0, o.screenMax ?? 0] as [number, number],
                batteryRange: [o.batteryMin ?? 0, o.batteryMax ?? 0] as [number, number],
                weightRange: [o.weightMin ?? 0, o.weightMax ?? 0] as [number, number],
                favoriteFilter: "all" as FavoriteFilter,
                sortBy: "alphabetical" as SortOption,
            };

            // Fiyat
            const price = toBounds(pf.price, o.minPrice, o.maxPrice);
            const priceRange: [number, number] = [
                typeof price.lo === "number" ? price.lo : base.priceRange[0],
                typeof price.hi === "number" ? price.hi : base.priceRange[1],
            ];

            // Ekran /Batarya/ Ağılık
            const scr = toBounds(pf.screen_inch, o.screenMin, o.screenMax);
            const screenRange: [number, number] = [
                typeof scr.lo === "number" ? scr.lo : base.screenRange[0],
                typeof scr.hi === "number" ? scr.hi : base.screenRange[1],
            ];

            const bat = toBounds(pf.battery_wh, o.batteryMin, o.batteryMax);
            const batteryRange: [number, number] = [
                typeof bat.lo === "number" ? bat.lo : base.batteryRange[0],
                typeof bat.hi === "number" ? bat.hi : base.batteryRange[1],
            ];

            const w = toBounds(pf.weight_kg, o.weightMin, o.weightMax);
            const weightRange: [number, number] = [
                typeof w.lo === "number" ? w.lo : base.weightRange[0],
                typeof w.hi === "number" ? w.hi : base.weightRange[1],
            ];

            // RAM / Depolama (discrete)
            let nextRams: number[] = [];
            const rRam = normRange(pf.ram_gb);
            if (typeof rRam.exact === "number") {
                nextRams = [rRam.exact];
            } else if (rRam.min != null || rRam.max != null) {
                const picked = pickDiscreteInRange(o.ramValues, rRam.min, rRam.max);
                if (picked.length) nextRams = picked;
            }

            let nextStorages: number[] = [];
            const rSto = normRange(pf.storage_gb);
            if (typeof rSto.exact === "number") {
                nextStorages = [rSto.exact];
            } else if (rSto.min != null || rSto.max != null) {
                const picked = pickDiscreteInRange(o.storageValues, rSto.min, rSto.max);
                if (picked.length) nextStorages = picked;
            }

            let nextCpus: string[] = [];
            if (Array.isArray(pf.cpus) && pf.cpus.length && Array.isArray(o.cpuValues) && o.cpuValues.length) {
                const canonMap = new Map(o.cpuValues.map((c) => [c.toLowerCase(), c]));
                nextCpus = Array.from(
                    new Set(
                        pf.cpus
                            .map((c) => (typeof c === "string" ? c.trim() : ""))
                            .filter(Boolean)
                            .map((c) => canonMap.get(c.toLowerCase()))
                            .filter(Boolean) as string[]
                    )
                );
            }

            // Sıralama AI -> SortOption
            let sortBy: SortOption = base.sortBy;
            switch (pf.sort) {
                case "price_asc":
                    sortBy = "price-asc";
                    break;
                case "price_desc":
                    sortBy = "price-desc";
                    break;
                case "rating_desc":
                    sortBy = "rating-desc";
                    break;
                case "rating_asc":
                    sortBy = "rating-asc";
                    break;
                // "alphabetical" base zaten öyle sanırım çünkü kafam karıştı bir bak buraya sorna
            }

            return {
                ...base,
                selectedCategories: uniq(pf.categories),
                selectedBrands: uniq(pf.brands),
                priceRange,
                screenRange,
                batteryRange,
                weightRange,
                selectedRams: nextRams,
                selectedStorages: nextStorages,
                selectedCpus: nextCpus,
                favoriteFilter: pf.favorite ?? base.favoriteFilter,
                sortBy,
            };
        }),
}));
