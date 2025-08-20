// components/topbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";

import { useFilters } from "@/state/useFilters";
import { useProductStats, useEnsureProductStats } from "@/lib/store/product-stats";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {Logo} from "@/components/logo";

export function TopBar() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // Drawer verileri
    useEnsureProductStats();
    const { categories, brands, minPrice, maxPrice, status } = useProductStats();
    const {
        selectedCategories, toggleCategory,
        selectedBrands, toggleBrand,
        priceRange, setPriceRange,
        favoriteFilter, setFavoriteFilter,
        clearAll,
    } = useFilters();

    useEffect(() => {
        if (minPrice == null || maxPrice == null) return;
        const [curMin, curMax] = priceRange;
        const DEFAULT_MIN = 0, DEFAULT_MAX = 100000;
        if (curMin === DEFAULT_MIN && curMax === DEFAULT_MAX) {
            setPriceRange([minPrice, maxPrice]);
            return;
        }
        const nextMin = Math.max(minPrice, curMin);
        const nextMax = Math.min(maxPrice, curMax);
        if (nextMin !== curMin || nextMax !== curMax) setPriceRange([nextMin, nextMax]);
    }, [minPrice, maxPrice, priceRange, setPriceRange]);

    const sliderDisabled = minPrice == null || maxPrice == null || status !== "success";
    const hasCategoryOptions = Array.isArray(categories) && categories.length > 0;
    const hasBrandOptions = Array.isArray(brands) && brands.length > 0;

    return (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="md:hidden inline-flex items-center gap-2"
                        onClick={() => setOpen(true)}
                    >
                        <SlidersHorizontal className="h-4 w-4" />

                    </Button>

                    <Link href="/" aria-label="Ana sayfa">
                        <Logo
                            lightSrc="/images/light-logo.png"
                            darkSrc="/images/dark-logo.png"
                            width={120}
                            height={32}
                            priority
                        />
                    </Link>
                </div>

                <ThemeToggle />
            </div>

            {/* Mobil Drawer diğer türlü ekrana oturmuyot filtre poanlei */}
            {open && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* arka plan karartma */}
                    <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
                    {/* çekmece kutusu → TAM OPak arka plan + sağ kenar çizgisi */}
                    <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[360px] bg-background border-r shadow-2xl animate-in slide-in-from-left">
                        {/* başlık da opak olsun */}
                        <div className="flex items-center justify-between border-b p-3 bg-background">
                            <h2 className="font-semibold">Filtreler</h2>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={clearAll}>Temizle</Button>
                                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Kapat">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="max-h-[calc(100vh-3.25rem)] overflow-y-auto p-4 space-y-6 [scrollbar-gutter:stable] bg-background">
                            {/* Fiyat */}
                            <section>
                                <h3 className="mb-2 text-sm font-medium">Fiyat Aralığı</h3>
                                <Slider
                                    value={priceRange}
                                    onValueChange={(val) => setPriceRange(val as [number, number])}
                                    min={minPrice ?? 0}
                                    max={maxPrice ?? 0}
                                    step={100}
                                    className="mb-2"
                                    disabled={sliderDisabled}
                                />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{sliderDisabled ? "—" : `${priceRange[0].toLocaleString("tr-TR")} ₺`}</span>
                                    <span>{sliderDisabled ? "—" : `${priceRange[1].toLocaleString("tr-TR")} ₺`}</span>
                                </div>
                            </section>

                            <Separator />

                            {/* Kategori */}
                            <section>
                                <h3 className="mb-2 text-sm font-medium">Kategori</h3>
                                <div className="space-y-2">
                                    {(categories ?? []).map((c: string) => (
                                        <div key={c} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`m-cat-${c}`}
                                                checked={selectedCategories.includes(c)}
                                                onCheckedChange={() => toggleCategory(c)}
                                                disabled={!hasCategoryOptions || status !== "success"}
                                            />
                                            <Label htmlFor={`m-cat-${c}`} className="capitalize">{c}</Label>
                                        </div>
                                    ))}
                                    {!hasCategoryOptions && (
                                        <p className="text-xs text-muted-foreground">Kategori verisi yükleniyor…</p>
                                    )}
                                </div>
                            </section>

                            <Separator />

                            {/* Marka */}
                            <section>
                                <h3 className="mb-2 text-sm font-medium">Marka</h3>
                                <div className="space-y-2">
                                    {(brands ?? []).map((b: string) => (
                                        <div key={b} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`m-brand-${b}`}
                                                checked={selectedBrands.includes(b)}
                                                onCheckedChange={() => toggleBrand(b)}
                                                disabled={!hasBrandOptions || status !== "success"}
                                            />
                                            <Label htmlFor={`m-brand-${b}`}>{b}</Label>
                                        </div>
                                    ))}
                                    {!hasBrandOptions && (
                                        <p className="text-xs text-muted-foreground">Marka verisi yükleniyor…</p>
                                    )}
                                </div>
                            </section>

                            <Separator />

                            {/* Favoriler */}
                            <section>
                                <h3 className="mb-2 text-sm font-medium">Favoriler</h3>
                                <RadioGroup
                                    value={favoriteFilter}
                                    onValueChange={(val) => setFavoriteFilter(val as "all" | "only" | "non")}
                                >
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem id="m-fav-all" value="all" />
                                        <Label htmlFor="m-fav-all">Hepsi</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem id="m-fav-only" value="only" />
                                        <Label htmlFor="m-fav-only">Sadece Favoriler</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <RadioGroupItem id="m-fav-non" value="non" />
                                        <Label htmlFor="m-fav-non">Favori Olmayanlar</Label>
                                    </div>
                                </RadioGroup>
                            </section>

                            <Button className="w-full" onClick={() => setOpen(false)}>Uygula</Button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
