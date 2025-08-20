// src/lib/hooks/use-sync-filters-with-url.ts
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFilters } from "@/state/useFilters";
import { useProductStats } from "@/lib/store/product-stats";

const KEY = {
    category: "category",
    brand: "brand",
    minPrice: "minPrice",
    maxPrice: "maxPrice",
    sort: "sort",
    ram: "ram",
    storage: "storage",
    cpu: "cpu",
    screenMin: "screenMin",
    screenMax: "screenMax",
    batteryMin: "batteryMin",
    batteryMax: "batteryMax",
    weightMin: "weightMin",
    weightMax: "weightMax",
} as const;

const SORT_WHITELIST = new Set([
    "alphabetical",
    "price-asc",
    "price-desc",
    "rating-asc",
    "rating-desc",
]);

const toNum = (v: string | null) => {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

export function useSyncFiltersWithUrl() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { screen, battery, weight } = useProductStats();

    const {
        selectedCategories,
        toggleCategory,
        clearCategories,

        selectedBrands,
        toggleBrand,
        clearBrands,

        priceRange,
        setPriceRange,

        sortBy,
        setSortBy,

        selectedRams,
        toggleRam,
        clearRams,

        selectedStorages,
        toggleStorage,
        clearStorages,

        selectedCpus,
        toggleCpu,
        clearCpus,

        screenRange,
        setScreenRange,

        batteryRange,
        setBatteryRange,

        weightRange,
        setWeightRange,
    } = useFilters();

    const didInit = useRef(false);
    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;

        const categories = searchParams.getAll(KEY.category);
        const brands = searchParams.getAll(KEY.brand);
        const ramList = searchParams
            .getAll(KEY.ram)
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
        const storageList = searchParams
            .getAll(KEY.storage)
            .map((s) => Number(s))
            .filter((n) => Number.isFinite(n));
        const cpuList = searchParams
            .getAll(KEY.cpu)
            .map((s) => (typeof s === "string" ? s.trim() : ""))
            .filter(Boolean);

        const minPriceStr = searchParams.get(KEY.minPrice);
        const maxPriceStr = searchParams.get(KEY.maxPrice);
        const sort = searchParams.get(KEY.sort);

        const sMin = toNum(searchParams.get(KEY.screenMin));
        const sMax = toNum(searchParams.get(KEY.screenMax));
        const bMin = toNum(searchParams.get(KEY.batteryMin));
        const bMax = toNum(searchParams.get(KEY.batteryMax));
        const wMin = toNum(searchParams.get(KEY.weightMin));
        const wMax = toNum(searchParams.get(KEY.weightMax));

        if (categories.length) {
            clearCategories();
            categories.forEach((c) => toggleCategory(c));
        }

        if (brands.length) {
            clearBrands();
            brands.forEach((b) => toggleBrand(b));
        }

        if (ramList.length) {
            clearRams();
            ramList.forEach((v) => toggleRam(v));
        }

        if (storageList.length) {
            clearStorages();
            storageList.forEach((v) => toggleStorage(v));
        }

        if (cpuList.length) {
            clearCpus();
            cpuList.forEach((c) => toggleCpu(c));
        }

        if (minPriceStr != null && maxPriceStr != null) {
            const min = Number(minPriceStr);
            const max = Number(maxPriceStr);
            if (Number.isFinite(min) && Number.isFinite(max)) {
                setPriceRange([min, max]);
            }
        }

        // Rangeleri yalnızca iki uç da sayısal ve mantıklıysa uygulaasnsın
        if (sMin !== undefined && sMax !== undefined && sMin <= sMax) {
            setScreenRange([sMin, sMax]);
        }
        if (bMin !== undefined && bMax !== undefined && bMin <= bMax) {
            setBatteryRange([bMin, bMax]);
        }
        if (wMin !== undefined && wMax !== undefined && wMin <= wMax) {
            setWeightRange([wMin, wMax]);
        }

        //  sort: sadece store hâlâ default ise URL'den yazısın
        if (sort && SORT_WHITELIST.has(sort)) {
            const isDefault = sortBy === "alphabetical";
            console.debug("[useSyncFiltersWithUrl] init sort from URL:", {
                urlSort: sort,
                storeSortBefore: sortBy,
                applied: isDefault,
            });
            if (isDefault) {
                setSortBy(sort as typeof sortBy);
            }
        }
    }, [
        clearBrands,
        clearCategories,
        clearRams,
        clearStorages,
        clearCpus,
        searchParams,
        setBatteryRange,
        setPriceRange,
        setScreenRange,
        setSortBy,
        setWeightRange,
        toggleBrand,
        toggleCategory,
        toggleRam,
        toggleStorage,
        toggleCpu,
        sortBy, // yalnızca isDefault değerlendirmesi için
    ]);

    // - Store → URL ye yazalsın ---
    useEffect(() => {
        const next = new URLSearchParams();

        selectedCategories.forEach((c) => next.append(KEY.category, c));
        selectedBrands.forEach((b) => next.append(KEY.brand, b));

        if (priceRange?.[0] != null) next.set(KEY.minPrice, String(priceRange[0]));
        if (priceRange?.[1] != null) next.set(KEY.maxPrice, String(priceRange[1]));

        selectedRams.forEach((v) => next.append(KEY.ram, String(v)));
        selectedStorages.forEach((v) => next.append(KEY.storage, String(v)));
        selectedCpus.forEach((c) => next.append(KEY.cpu, c));

        const setRangeIfConstrained = (
            range: [number, number] | undefined,
            defaults: { min: number; max: number } | null | undefined,
            kMin: string,
            kMax: string
        ) => {
            if (!range) return;
            const [lo, hi] = range;
            if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
            if (lo === 0 && hi === 0) return; // stats daha gelmemiş olabilir kontrolü
            if (defaults && lo === defaults.min && hi === defaults.max) return;

            next.set(kMin, String(lo));
            next.set(kMax, String(hi));
        };

        setRangeIfConstrained(screenRange, screen, KEY.screenMin, KEY.screenMax);
        setRangeIfConstrained(batteryRange, battery, KEY.batteryMin, KEY.batteryMax);
        setRangeIfConstrained(weightRange, weight, KEY.weightMin, KEY.weightMax);

        if (sortBy) next.set(KEY.sort, sortBy);

        const current = searchParams.toString();
        const nextStr = next.toString();

        if (current !== nextStr) {
            console.debug("[useSyncFiltersWithUrl] push URL:", { next: nextStr });
            router.replace(`?${nextStr}`, { scroll: false });
        }
    }, [
        selectedCategories,
        selectedBrands,
        priceRange,
        selectedRams,
        selectedStorages,
        selectedCpus,
        screenRange,
        batteryRange,
        weightRange,
        sortBy,
        screen,
        battery,
        weight,
        router,
        searchParams,
    ]);
}
