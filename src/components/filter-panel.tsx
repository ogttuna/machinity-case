// components/filter-panel.tsx
"use client";

import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/state/useFilters";
import { useProductStats, useEnsureProductStats } from "@/lib/store/product-stats";

export function FilterPanel() {
    useEnsureProductStats();

    const {
        // mevcut seçimler
        selectedCategories,
        toggleCategory,
        selectedBrands,
        toggleBrand,
        priceRange,
        setPriceRange,
        favoriteFilter,
        setFavoriteFilter,
        clearAll,

        // teknik seçimler
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

        // options setleme (stats → filters bridge)
        setOptions,
    } = useFilters();

    const {
        categories,
        brands,
        minPrice,
        maxPrice,
        status,

        ramValues,
        storageValues,
        screen,
        battery,
        weight,

        cpuValues,
    } = useProductStats();

    /* ---------- stats → filters.options köprüsü ---------- */
    useEffect(() => {
        if (status !== "success") return;
        setOptions({
            categories,
            brands,
            minPrice: minPrice ?? 0,
            maxPrice: maxPrice ?? 0,
            ramValues,
            storageValues,
            cpuValues,
            screenMin: screen?.min,
            screenMax: screen?.max,
            batteryMin: battery?.min,
            batteryMax: battery?.max,
            weightMin: weight?.min,
            weightMax: weight?.max,
        });
    }, [
        status,
        categories,
        brands,
        minPrice,
        maxPrice,
        ramValues,
        storageValues,
        screen,
        battery,
        weight,
        cpuValues,
        setOptions,
    ]);

    /* ---------- Fiyat default senkronu --------- */
    useEffect(() => {
        if (minPrice == null || maxPrice == null) return;
        const [curMin, curMax] = priceRange;
        const DEFAULT_MIN = 0;
        const DEFAULT_MAX = 100000;
        if (curMin === DEFAULT_MIN && curMax === DEFAULT_MAX) {
            setPriceRange([minPrice, maxPrice]);
            return;
        }
        const nextMin = Math.max(minPrice, curMin);
        const nextMax = Math.min(maxPrice, curMax);
        if (nextMin !== curMin || nextMax !== curMax) setPriceRange([nextMin, nextMax]);
    }, [minPrice, maxPrice, priceRange, setPriceRange]);

    /* ---------- Ekran/Batarya /Ağirlık default senkornu ---------- */
    useEffect(() => {
        if (!screen) return;
        const [lo, hi] = screenRange;
        if (lo === 0 && hi === 0) setScreenRange([screen.min, screen.max]);
        else {
            const nextLo = Math.max(screen.min, lo);
            const nextHi = Math.min(screen.max, hi);
            if (nextLo !== lo || nextHi !== hi) setScreenRange([nextLo, nextHi]);
        }
    }, [screen, screenRange, setScreenRange]);

    useEffect(() => {
        if (!battery) return;
        const [lo, hi] = batteryRange;
        if (lo === 0 && hi === 0) setBatteryRange([battery.min, battery.max]);
        else {
            const nextLo = Math.max(battery.min, lo);
            const nextHi = Math.min(battery.max, hi);
            if (nextLo !== lo || nextHi !== hi) setBatteryRange([nextLo, nextHi]);
        }
    }, [battery, batteryRange, setBatteryRange]);

    useEffect(() => {
        if (!weight) return;
        const [lo, hi] = weightRange;
        if (lo === 0 && hi === 0) setWeightRange([weight.min, weight.max]);
        else {
            const nextLo = Math.max(weight.min, lo);
            const nextHi = Math.min(weight.max, hi);
            if (nextLo !== lo || nextHi !== hi) setWeightRange([nextLo, nextHi]);
        }
    }, [weight, weightRange, setWeightRange]);

    /* ---------- UI yardımcı ------- */
    const sliderDisabled = minPrice == null || maxPrice == null || status !== "success";
    const hasCategoryOptions = Array.isArray(categories) && categories.length > 0;
    const hasBrandOptions = Array.isArray(brands) && brands.length > 0;

    const ramsDisabled =
        !Array.isArray(ramValues) || ramValues.length === 0 || status !== "success";
    const storagesDisabled =
        !Array.isArray(storageValues) || storageValues.length === 0 || status !== "success";
    const cpusDisabled =
        !Array.isArray(cpuValues) || cpuValues.length === 0 || status !== "success";

    const screenDisabled = !screen || status !== "success";
    const batteryDisabled = !battery || status !== "success";
    const weightDisabled = !weight || status !== "success";

    // adım hassasiyetleri dinamik mi olsa acaba? max mine göre falan daha mı iyi
    const screenStep = 0.1;
    const batteryStep = 10;
    const weightStep = 0.1;

    return (
        <aside className="hidden md:block w-64 lg:w-72 shrink-0 sticky top-14 self-start">
            <div className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto rounded-lg border bg-background p-4 [scrollbar-gutter:stable]">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Filtreler</h2>
                        <Button variant="ghost" size="sm" onClick={clearAll}>
                            Tümünü Temizle
                        </Button>
                    </div>

                    {/* Fiyat */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">Fiyat Aralığı</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                    if (minPrice != null && maxPrice != null) setPriceRange([minPrice, maxPrice]);
                                }}
                                disabled={sliderDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <Slider
                            value={priceRange}
                            onValueCommit={(val) => {
                                const [lo, hi] = val as [number, number];
                                if (lo === priceRange[0] && hi === priceRange[1]) return; // guard
                                setPriceRange([lo, hi]);
                            }}
                            min={minPrice ?? 0}
                            max={maxPrice ?? 0}
                            step={100}
                            className="mb-2"
                            disabled={sliderDisabled}
                        />

                        <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {sliderDisabled ? "—" : `${priceRange[0].toLocaleString("tr-TR")} ₺`}
              </span>
                            <span>
                {sliderDisabled ? "—" : `${priceRange[1].toLocaleString("tr-TR")} ₺`}
              </span>
                        </div>
                    </section>

                    <Separator />

                    {/* Kategori*/}
                    <section>
                        <h3 className="mb-2 text-sm font-medium">Kategori</h3>
                        <div className="space-y-2">
                            {(categories ?? []).map((c: string) => (
                                <div key={c} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`cat-${c}`}
                                        checked={selectedCategories.includes(c)}
                                        onCheckedChange={() => toggleCategory(c)}
                                        disabled={!hasCategoryOptions || status !== "success"}
                                    />
                                    <Label htmlFor={`cat-${c}`} className="capitalize">
                                        {c}
                                    </Label>
                                </div>
                            ))}
                            {!hasCategoryOptions && (
                                <p className="text-xs text-muted-foreground">Kategori verisi yükleniyor…</p>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/*Marka */}
                    <section>
                        <h3 className="mb-2 text-sm font-medium">Marka</h3>
                        <div className="space-y-2">
                            {(brands ?? []).map((b: string) => (
                                <div key={b} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`brand-${b}`}
                                        checked={selectedBrands.includes(b)}
                                        onCheckedChange={() => toggleBrand(b)}
                                        disabled={!hasBrandOptions || status !== "success"}
                                    />
                                    <Label htmlFor={`brand-${b}`}>{b}</Label>
                                </div>
                            ))}
                            {!hasBrandOptions && (
                                <p className="text-xs text-muted-foreground">Marka verisi yükleniyor…</p>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/* RAM */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">RAM</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={clearRams}
                                disabled={ramsDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {(ramValues ?? []).map((v) => (
                                <div key={`ram-${v}`} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`ram-${v}`}
                                        checked={selectedRams.includes(v)}
                                        onCheckedChange={() => toggleRam(v)}
                                        disabled={ramsDisabled}
                                    />
                                    <Label htmlFor={`ram-${v}`}>{v} GB</Label>
                                </div>
                            ))}
                            {ramsDisabled && (
                                <p className="text-xs text-muted-foreground">RAM seçenekleri yükleniyor…</p>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/*Depolama*/}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">Depolama</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={clearStorages}
                                disabled={storagesDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {(storageValues ?? []).map((v) => (
                                <div key={`storage-${v}`} className="flex items-center gap-2">
                                    <Checkbox
                                        id={`storage-${v}`}
                                        checked={selectedStorages.includes(v)}
                                        onCheckedChange={() => toggleStorage(v)}
                                        disabled={storagesDisabled}
                                    />
                                    <Label htmlFor={`storage-${v}`}>{v} GB</Label>
                                </div>
                            ))}
                            {storagesDisabled && (
                                <p className="text-xs text-muted-foreground">
                                    Depolama seçenekleri yükleniyor…
                                </p>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/*  CPU */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">CPU</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={clearCpus}
                                disabled={cpusDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {(cpuValues ?? []).map((cpu, i) => {
                                const id = `cpu-${i}`;
                                return (
                                    <div key={`${cpu}-${i}`} className="flex items-center gap-2">
                                        <Checkbox
                                            id={id}
                                            checked={selectedCpus.includes(cpu)}
                                            onCheckedChange={() => toggleCpu(cpu)}
                                            disabled={cpusDisabled}
                                        />
                                        <Label htmlFor={id}>{cpu}</Label>
                                    </div>
                                );
                            })}
                            {cpusDisabled && (
                                <p className="text-xs text-muted-foreground">CPU seçenekleri yükleniyor…</p>
                            )}
                        </div>
                    </section>

                    <Separator />

                    {/* Ekran  */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">Ekran (inç)</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                    if (screen) setScreenRange([screen.min, screen.max]);
                                }}
                                disabled={screenDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <Slider
                            value={screenRange}
                            onValueChange={(val) => setScreenRange(val as [number, number])}
                            min={screen?.min ?? 0}
                            max={screen?.max ?? 0}
                            step={screenStep}
                            className="mb-2"
                            disabled={screenDisabled}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{screenDisabled ? "—" : `${screenRange[0].toFixed(1)} inç`}</span>
                            <span>{screenDisabled ? "—" : `${screenRange[1].toFixed(1)} inç`}</span>
                        </div>
                    </section>

                    <Separator />

                    {/* Batarya */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">Batarya (Wh)</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                    if (battery) setBatteryRange([battery.min, battery.max]);
                                }}
                                disabled={batteryDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <Slider
                            value={batteryRange}
                            onValueChange={(val) => setBatteryRange(val as [number, number])}
                            min={battery?.min ?? 0}
                            max={battery?.max ?? 0}
                            step={batteryStep}
                            className="mb-2"
                            disabled={batteryDisabled}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{batteryDisabled ? "—" : `${Math.round(batteryRange[0])} Wh`}</span>
                            <span>{batteryDisabled ? "—" : `${Math.round(batteryRange[1])} Wh`}</span>
                        </div>
                    </section>

                    <Separator />

                    {/* Ağırlık */}
                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-medium">Ağırlık (kg)</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => {
                                    if (weight) setWeightRange([weight.min, weight.max]);
                                }}
                                disabled={weightDisabled}
                            >
                                Temizle
                            </Button>
                        </div>
                        <Slider
                            value={weightRange}
                            onValueChange={(val) => setWeightRange(val as [number, number])}
                            min={weight?.min ?? 0}
                            max={weight?.max ?? 0}
                            step={weightStep}
                            className="mb-2"
                            disabled={weightDisabled}
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{weightDisabled ? "—" : `${weightRange[0].toFixed(1)} kg`}</span>
                            <span>{weightDisabled ? "—" : `${weightRange[1].toFixed(1)} kg`}</span>
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
                                <RadioGroupItem id="fav-all" value="all" />
                                <Label htmlFor="fav-all">Hepsi</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem id="fav-only" value="only" />
                                <Label htmlFor="fav-only">Sadece Favoriler</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem id="fav-non" value="non" />
                                <Label htmlFor="fav-non">Favori Olmayanlar</Label>
                            </div>
                        </RadioGroup>
                    </section>
                </div>
            </div>
        </aside>
    );
}
