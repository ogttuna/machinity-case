// src/app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/topbar";
import { ProductCard } from "@/components/product-card";
import { FilterPanel } from "@/components/filter-panel";
import { SortDropdown } from "@/components/sort-dropdown";
import { useFilters } from "@/state/useFilters";
import { useFavoriteStore } from "@/lib/store/favorites";
import { useProductStats } from "@/lib/store/product-stats";
import { ProductsSchema, type Product } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { useSyncFiltersWithUrl } from "@/lib/hooks/use-sync-filters-with-url";
import { NLSearch } from "@/components/nl-search";

import { useCompare } from "@/state/useCompare";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompareDialogContent } from "@/components/compare-dialog";

const ListResponseSchema = z.object({
    items: ProductsSchema,
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    hasNextPage: z.boolean(),
});

function buildQuery({
                        categories,
                        brands,
                        priceRange,
                        rams,
                        storages,
                        cpus, // ✅ eklendi
                        screenRange,
                        batteryRange,
                        weightRange,
                        sortBy,
                        page,
                        pageSize,
                        screenDefaults,
                        batteryDefaults,
                        weightDefaults,
                    }: {
    categories: string[];
    brands: string[];
    priceRange: [number, number];
    rams: number[];
    storages: number[];
    cpus: string[];
    screenRange: [number, number];
    batteryRange: [number, number];
    weightRange: [number, number];
    sortBy: "alphabetical" | "price-asc" | "price-desc" | "rating-asc" | "rating-desc";
    page: number;
    pageSize: number;
    screenDefaults?: { min: number; max: number };
    batteryDefaults?: { min: number; max: number };
    weightDefaults?: { min: number; max: number };
}) {
    const sp = new URLSearchParams();

    // çoklu seçimler
    categories.forEach((c) => sp.append("category", c));
    brands.forEach((b) => sp.append("brand", b));
    rams.forEach((v) => sp.append("ram", String(v)));
    storages.forEach((v) => sp.append("storage", String(v)));
    cpus.forEach((cpu) => sp.append("cpu", cpu));

    // aralıkları sadece "default’tan farklıysa yazdırıyorm
    const setRangeIfConstrained = (
        range: [number, number] | undefined,
        defaults: { min: number; max: number } | undefined,
        kMin: string,
        kMax: string
    ) => {
        if (!range) return;
        const [lo, hi] = range;
        if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;

        if (lo === 0 && hi === 0) return; //stat gelmediyse şey omasın

        if (defaults && lo === defaults.min && hi === defaults.max) return;

        sp.set(kMin, String(lo));
        sp.set(kMax, String(hi));
    };

    sp.set("minPrice", String(priceRange[0]));
    sp.set("maxPrice", String(priceRange[1]));

    setRangeIfConstrained(screenRange, screenDefaults, "screenMin", "screenMax");
    setRangeIfConstrained(batteryRange, batteryDefaults, "batteryMin", "batteryMax");
    setRangeIfConstrained(weightRange, weightDefaults, "weightMin", "weightMax");

    sp.set("sort", sortBy);
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));

    return `/api/products?${sp.toString()}`;
}

export default function Page() {
    const {
        selectedCategories,
        toggleCategory,
        selectedBrands,
        toggleBrand,
        priceRange,
        setPriceRange,
        favoriteFilter,
        setFavoriteFilter,
        sortBy,

        selectedRams,
        toggleRam,
        selectedStorages,
        toggleStorage,

        selectedCpus,
        toggleCpu,

        screenRange,
        setScreenRange,
        batteryRange,
        setBatteryRange,
        weightRange,
        setWeightRange,
    } = useFilters();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const favorites = useFavoriteStore((s) => s.favorites);
    const { minPrice, maxPrice, screen, battery, weight } = useProductStats();

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [total, setTotal] = useState<number | null>(null);

    const pageSize = 12;

    // Compare state
    const enabled = useCompare((s) => s.enabled);
    const count = useCompare((s) => s.count());
    const toggleCompare = useCompare((s) => s.toggleEnabled);
    const clearCompare = useCompare((s) => s.clear);
    const selectedIds = useCompare((s) => s.selectedIds);

    // Compare dialog
    const [compareOpen, setCompareOpen] = useState(false);
    useEffect(() => {
        if (!compareOpen) {
            clearCompare(); // dialog kapanınca seçimleri sıfırlnasnın
        }
    }, [compareOpen, clearCompare]);

    // filtre/Sort  değiştiğinde  listeyi sıfırlasın kalmasın şeyler
    useEffect(() => {
        setProducts([]);
        setPage(1);
        setTotal(null);
    }, [
        selectedCategories,
        selectedBrands,
        priceRange,
        sortBy,
        selectedRams,
        selectedStorages,
        selectedCpus,
        screenRange,
        batteryRange,
        weightRange,
    ]);

    // ürün fetch et
    useEffect(() => {
        const ac = new AbortController();
        (async () => {
            try {
                setLoadingProducts(true);
                const url = buildQuery({
                    categories: selectedCategories,
                    brands: selectedBrands,
                    priceRange,
                    rams: selectedRams,
                    storages: selectedStorages,
                    cpus: selectedCpus, // ✅ eklendi
                    screenRange,
                    batteryRange,
                    weightRange,
                    sortBy,
                    page,
                    pageSize,
                    screenDefaults: screen ?? undefined,
                    batteryDefaults: battery ?? undefined,
                    weightDefaults: weight ?? undefined,
                });

                const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                const parsed = ListResponseSchema.safeParse(json);
                if (parsed.success) {
                    setProducts((prev) => (page === 1 ? parsed.data.items : [...prev, ...parsed.data.items]));
                    setHasNextPage(parsed.data.hasNextPage);
                    setTotal(parsed.data.total);
                } else {
                    if (page === 1) setProducts([]);
                    setHasNextPage(false);
                    setTotal(null);
                }
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                if (page === 1) setProducts([]);
                setHasNextPage(false);
                setTotal(null);
            } finally {
                setLoadingProducts(false);
            }
        })();
        return () => ac.abort();
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
        page,
    ]);

    const shown = useMemo(() => {
        if (!mounted) return products;
        if (favoriteFilter === "only") {
            return products.filter((p) => favorites.includes(String(p.id)));
        }
        if (favoriteFilter === "non") {
            return products.filter((p) => !favorites.includes(String(p.id)));
        }
        return products;
    }, [mounted, favoriteFilter, favorites, products]);

    useSyncFiltersWithUrl();

    const clearPriceToMinMax = () => {
        if (minPrice != null && maxPrice != null) {
            setPriceRange([minPrice, maxPrice]);
        }
    };

    const showPriceChip =
        minPrice != null && maxPrice != null && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const ioRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (!sentinelRef.current) return;
        if (loadingProducts || !hasNextPage) return;

        if (ioRef.current) {
            ioRef.current.disconnect();
            ioRef.current = null;
        }

        const obs = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry.isIntersecting) return;
                setPage((prev) => prev + 1);
            },
            {
                root: null,
                rootMargin: "400px 0px",
                threshold: 0.01,
            }
        );

        obs.observe(sentinelRef.current);
        ioRef.current = obs;

        return () => {
            obs.disconnect();
            ioRef.current = null;
        };
    }, [hasNextPage, loadingProducts]);

    return (
        <>
            <TopBar />
            {/* Merkezde, geniş ekranlarda ferah; mobilde dar padding respnsicee*/}
            <main className="mx-auto w-full max-w-[1600px] px-2 sm:px-4 flex gap-6 lg:gap-10 py-4 md:py-6">
                <FilterPanel />

                <div className="flex-1">
                    <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold">Ürünler</h1>
                        <NLSearch />

                        {/* Compare modu toggle + sayaç sadece iki tane seçeşbilsin şimdilik karşılarıtrma için */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={enabled ? "default" : "outline"}
                                onClick={() => toggleCompare()}
                                aria-pressed={enabled}
                                title="Karşılaştırma modunu aç/kapat"
                            >
                                Karşılaştırma {enabled ? "Açık" : "Kapalı"}
                            </Button>
                            <span className="text-xs text-muted-foreground">{count}/2 seçili</span>
                        </div>


                        <SortDropdown />
                    </div>

                    {/* Seçili filtreler */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">

                        {/* Kategori */}
                        {selectedCategories.map((c) => (
                            <button
                                key={`cat-chip-${c}`}
                                onClick={() => toggleCategory(c)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                                <span className="capitalize">{c}</span>
                                <span aria-hidden>✕</span>
                            </button>
                        ))}

                        {/* Marka */}
                        {selectedBrands.map((b) => (
                            <button
                                key={`brand-chip-${b}`}
                                onClick={() => toggleBrand(b)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                                <span>{b}</span>
                                <span aria-hidden>✕</span>
                            </button>
                        ))}


                        {/* RAM */}
                        {selectedRams.map((v) => (
                            <button
                                key={`ram-chip-${v}`}
                                onClick={() => toggleRam(v)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                                <span>{v} GB RAM</span>
                                <span aria-hidden>✕</span>
                            </button>
                        ))}

                        {/* Depolama */}
                        {selectedStorages.map((v) => (
                            <button
                                key={`storage-chip-${v}`}
                                onClick={() => toggleStorage(v)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                                <span>{v} GB Depolama</span>
                                <span aria-hidden>✕</span>
                            </button>
                        ))}

                        {/*  CPU */}
                        {selectedCpus.map((cpu) => (
                            <button
                                key={`cpu-chip-${cpu}`}
                                onClick={() => toggleCpu(cpu)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                                title="CPU filtresini kaldır"
                            >
                                <span>{cpu}</span>
                                <span aria-hidden>✕</span>
                            </button>
                        ))}

                        {/* Fiyat */}
                        {showPriceChip && (
                            <button
                                onClick={clearPriceToMinMax}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                <span>
                  {priceRange[0].toLocaleString("tr-TR")} ₺ – {priceRange[1].toLocaleString("tr-TR")} ₺
                </span>
                                <span aria-hidden>✕</span>
                            </button>
                        )}

                        {/* Ekran */}
                        {screen && (screenRange[0] !== screen.min || screenRange[1] !== screen.max) && (
                            <button
                                onClick={() => setScreenRange([screen.min, screen.max])}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                <span>
                  {screenRange[0].toFixed(1)}&quot; – {screenRange[1].toFixed(1)}&quot;
                </span>
                                <span aria-hidden>✕</span>
                            </button>
                        )}

                        {/* Batarya */}
                        {battery && (batteryRange[0] !== battery.min || batteryRange[1] !== battery.max) && (
                            <button
                                onClick={() => setBatteryRange([battery.min, battery.max])}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                <span>
                  {Math.round(batteryRange[0])}–{Math.round(batteryRange[1])} Wh
                </span>
                                <span aria-hidden>✕</span>
                            </button>
                        )}

                        {/* Ağırlık */}
                        {weight && (weightRange[0] !== weight.min || weightRange[1] !== weight.max) && (
                            <button
                                onClick={() => setWeightRange([weight.min, weight.max])}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                <span>
                  {weightRange[0].toFixed(1)}–{weightRange[1].toFixed(1)} kg
                </span>
                                <span aria-hidden>✕</span>
                            </button>
                        )}

                        {/* Favoriler */}
                        {favoriteFilter !== "all" && (
                            <button
                                onClick={() => setFavoriteFilter("all")}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground"
                            >
                                <span>{favoriteFilter === "only" ? "Sadece Favoriler" : "Favori Olmayanlar"}</span>
                                <span aria-hidden>✕</span>
                            </button>
                        )}
                    </div>

                    {/* Toplam */}
                    <p className="mb-4 text-sm text-muted-foreground">
                        {loadingProducts && page === 1
                            ? "Yükleniyor..."
                            : total != null
                                ? favoriteFilter === "all"
                                    ? `${total} sonuç`
                                    : `${shown.length} / ${total} sonuç`
                                : `${shown.length} sonuç`}
                    </p>

                    {loadingProducts && page === 1 ? (
                        <p className="text-muted-foreground">Ürünler yükleniyor…</p>
                    ) : shown.length === 0 ? (
                        <p className="text-muted-foreground">
                            {favoriteFilter !== "all" && !mounted ? "Favori bilgisi yükleniyor…" : "Seçilen filtrelere uygun ürün yok."}
                        </p>
                    ) : (
                        <>
                            {/* Respnsicve ızagara */}
                            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
                                {shown.map((p) => (
                                    <ProductCard key={p.id} product={p} />
                                ))}
                            </div>

                            {hasNextPage && (
                                <div className="mt-6 flex justify-center">
                                    <Button variant="outline" disabled={loadingProducts} onClick={() => setPage((prev) => prev + 1)}>
                                        {loadingProducts ? "Yükleniyor…" : "Daha Fazla Yükle"}
                                    </Button>
                                </div>
                            )}

                            <div ref={sentinelRef} className="h-1" aria-hidden />
                        </>
                    )}

                    {/* Sticky action bar: sadece compare açıkken gözüküyro */}
                    {enabled && (
                        <div
                            className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border bg-background/95 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60"
                            role="region"
                            aria-label="Karşılaştırma çubuğu"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-sm">{count}/2 seçili</span>
                                <Button size="sm" disabled={count !== 2} onClick={() => setCompareOpen(true)}>
                                    Karşılaştır
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Karşılaştırma Dialog */}
                    <Dialog
                        open={compareOpen}
                        onOpenChange={(open) => {
                            setCompareOpen(open);
                            if (!open) clearCompare();
                        }}
                    >
                        <DialogContent
                            className="
      sm:max-w-4xl
      w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]
      p-4 sm:p-6
      md:max-h-[85vh] overflow-y-auto
    "
                        >
                            <DialogHeader className="pr-10">
                                <DialogTitle>
                                    Ürün Karşılaştırma {selectedIds.length > 0 && `(${selectedIds.length}/2)`}
                                </DialogTitle>
                            </DialogHeader>

                            <CompareDialogContent open={compareOpen} />
                        </DialogContent>
                    </Dialog>

                </div>
            </main>
        </>
    );
}
