// src/components/compare-dialog.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCompare } from "@/state/useCompare";

/* -------------------- Zod şemaları ---------------- */

const lineStr = z.string().max(200);
const shortStr = z.string().max(400);

const ProductSummaryItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().nullable().default(null),
    cpu: z.string().nullable().default(null),
    ram_gb: z.number().nullable().default(null),
    storage_gb: z.number().nullable().default(null),
    screen_inch: z.number().nullable().default(null),
    battery_wh: z.number().nullable().default(null),
    rating: z.number().nullable().default(null),
    pros: z.array(lineStr).max(5).default([]),
    cons: z.array(lineStr).max(5).default([]),
});

const ResponseComparisonSchema = z.object({
    request_id: z.string().optional(),
    comparison: z.array(ProductSummaryItemSchema).length(2),
    summary: z.object({
        tldr: shortStr,
        value_for_money: z.enum(["poor", "average", "good", "excellent"]).default("average"),
    }),
});

type CompareResponse = z.infer<typeof ResponseComparisonSchema>;
type Item = z.infer<typeof ProductSummaryItemSchema>;

/* ---------------------- Yardımcılar ------------------------------ */

function fmtPrice(n: number | null) {
    return typeof n === "number" ? `${n.toLocaleString("tr-TR")} ₺` : "—";
}
/*function badgeLabel(v: "poor" | "average" | "good" | "excellent") {
    return { poor: "Zayıf", average: "Orta", good: "İyi", excellent: "Mükemmel" }[v];
}*/

/** Daha iyi = yeşil olsn, daha kötü = kırmızı gözükür, eşit/boş = nötr gri var oalna renkte zaten. */
function diffClass(
    a: number | null,
    b: number | null,
    betterWhen: "higher" | "lower"
): ["text-green-600" | "text-red-600" | "text-muted-foreground", "text-green-600" | "text-red-600" | "text-muted-foreground"] {
    if (a == null || b == null) return ["text-muted-foreground", "text-muted-foreground"];
    if (a === b) return ["text-muted-foreground", "text-muted-foreground"];

    const aBetter = betterWhen === "higher" ? a > b : a < b;
    return [
        aBetter ? "text-green-600" : "text-red-600",
        aBetter ? "text-red-600" : "text-green-600",
    ];
}

/* ------------------------------- Bileşen ------------------------- */

export function CompareDialogContent({ open }: { open: boolean }) {
    const selectedIds = useCompare((s) => s.selectedIds);
    const clearCompare = useCompare((s) => s.clear);

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<CompareResponse | null>(null);

    const acRef = useRef<AbortController | null>(null);

    const fetchCompare = useCallback(async () => {
        if (!open) return;
        if (selectedIds.length !== 2) return;

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        try {
            setLoading(true);
            setErr(null);
            setData(null);

            const res = await fetch("/api/ai/compare", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                signal: ac.signal,
                body: JSON.stringify({ productIds: selectedIds }),
            });

            // JSON parseı güvnli
            const json: unknown = await res.json();

            if (!res.ok) {
                let message: string;

                if (typeof json === "object" && json !== null && "error" in json) {
                    const errVal = (json as { error?: unknown }).error;
                    message = typeof errVal === "string" ? errVal : `HTTP ${res.status}`;
                } else {
                    message = `HTTP ${res.status}`;
                }

                throw new Error(message);
            }

            const parsed = ResponseComparisonSchema.safeParse(json);
            if (!parsed.success) {
                throw new Error("Yanıt şemaya uymuyor.");
            }
            setData(parsed.data);
        } catch (e: unknown) {
            if (e instanceof Error) {
                if (e.name !== "AbortError") {
                    setErr(e.message || "Bir şeyler ters gitti.");
                }
            } else {
                setErr("Bilinmeyen bir hata oluştu.");
            }
        } finally {
            setLoading(false);
        }
    }, [open, selectedIds]);


    // Açılınca fetch; kapanınca temizlensin 0dan
    useEffect(() => {
        if (open) {
            fetchCompare();
        } else {
            acRef.current?.abort();
            setLoading(false);
            setErr(null);
            setData(null);
        }
        return () => {
            acRef.current?.abort();
        };
    }, [open, fetchCompare]);

    const [a, b]: [Item | null, Item | null] = useMemo(() => {
        if (!data) return [null, null];
        return [data.comparison[0], data.comparison[1]];
    }, [data]);

    // Heuristics (screen_inch tarafsız) hangisi daha iyi muhabbeti
    const priceColors = useMemo(
        () => diffClass(a?.price ?? null, b?.price ?? null, "lower"),
        [a?.price, b?.price]
    );
    const ramColors = useMemo(
        () => diffClass(a?.ram_gb ?? null, b?.ram_gb ?? null, "higher"),
        [a?.ram_gb, b?.ram_gb]
    );
    const storageColors = useMemo(
        () => diffClass(a?.storage_gb ?? null, b?.storage_gb ?? null, "higher"),
        [a?.storage_gb, b?.storage_gb]
    );
    const batteryColors = useMemo(
        () => diffClass(a?.battery_wh ?? null, b?.battery_wh ?? null, "higher"),
        [a?.battery_wh, b?.battery_wh]
    );
    const ratingColors = useMemo(
        () => diffClass(a?.rating ?? null, b?.rating ?? null, "higher"),
        [a?.rating, b?.rating]
    );

    const [priceA, priceB] = priceColors;
    const [ramA, ramB] = ramColors;
    const [stoA, stoB] = storageColors;
    const [batA, batB] = batteryColors;
    const [ratA, ratB] = ratingColors;

    return (
        <div className="space-y-4">
            {loading && (
                <div className="py-8 text-sm text-muted-foreground">
                    Karşılaştırma hazırlanıyor…
                </div>
            )}

            {!loading && err && (
                <div className="space-y-3">
                    <p className="text-sm text-red-600">{err}</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={fetchCompare}>
                            Tekrar Dene
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                clearCompare(); // parent onOpenChange zaten kapatınca temizliyo
                            }}
                        >
                            Seçimleri Temizle
                        </Button>
                    </div>
                </div>
            )}

            {!loading && !err && a && b && data && (
                <>
                    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2">

                        {/* İlk ürün */}
                        <div className="rounded-lg border p-4">
                            <div className="mb-1 text-sm text-muted-foreground">Ürün A</div>
                            <h3 className="text-base font-semibold">{a.name}</h3>
                            <p className="text-sm">
                                Fiyat: <span className={priceA}>{fmtPrice(a.price)}</span>
                            </p>
                            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">CPU</dt>
                                    <dd>{a.cpu ?? "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">RAM</dt>
                                    <dd className={ramA}>
                                        {a.ram_gb != null ? `${a.ram_gb} GB` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Depolama</dt>
                                    <dd className={stoA}>
                                        {a.storage_gb != null ? `${a.storage_gb} GB` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Ekran</dt>
                                    <dd>{a.screen_inch != null ? `${a.screen_inch}"` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Batarya</dt>
                                    <dd className={batA}>
                                        {a.battery_wh != null ? `${a.battery_wh} Wh` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Puan</dt>
                                    <dd className={ratA}>{a.rating ?? "—"}</dd>
                                </div>
                            </dl>

                            <Separator className="my-3" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold">Artılar</h4>
                                    {a.pros.length ? (
                                        <ul className="list-disc pl-5 text-sm">
                                            {a.pros.map((x, i) => (
                                                <li key={`a-pro-${i}`}>{x}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">—</p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold">Eksiler</h4>
                                    {a.cons.length ? (
                                        <ul className="list-disc pl-5 text-sm">
                                            {a.cons.map((x, i) => (
                                                <li key={`a-con-${i}`}>{x}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">—</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ürün 2 */}
                        <div className="rounded-lg border p-4">
                            <div className="mb-1 text-sm text-muted-foreground">Ürün B</div>
                            <h3 className="text-base font-semibold">{b.name}</h3>
                            <p className="text-sm">
                                Fiyat: <span className={priceB}>{fmtPrice(b.price)}</span>
                            </p>
                            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">CPU</dt>
                                    <dd>{b.cpu ?? "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">RAM</dt>
                                    <dd className={ramB}>
                                        {b.ram_gb != null ? `${b.ram_gb} GB` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Depolama</dt>
                                    <dd className={stoB}>
                                        {b.storage_gb != null ? `${b.storage_gb} GB` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Ekran</dt>
                                    <dd>{b.screen_inch != null ? `${b.screen_inch}"` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Batarya</dt>
                                    <dd className={batB}>
                                        {b.battery_wh != null ? `${b.battery_wh} Wh` : "—"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Puan</dt>
                                    <dd className={ratB}>{b.rating ?? "—"}</dd>
                                </div>
                            </dl>

                            <Separator className="my-3" />
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold">Artılar</h4>
                                    {b.pros.length ? (
                                        <ul className="list-disc pl-5 text-sm">
                                            {b.pros.map((x, i) => (
                                                <li key={`b-pro-${i}`}>{x}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">—</p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold">Eksiler</h4>
                                    {b.cons.length ? (
                                        <ul className="list-disc pl-5 text-sm">
                                            {b.cons.map((x, i) => (
                                                <li key={`b-con-${i}`}>{x}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">—</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/*<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm leading-relaxed">{data.summary.tldr}</p>
                        <span
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs"
                            title="Fiyat/Performans"
                            aria-label={`Fiyat/Performans: ${badgeLabel(data.summary.value_for_money)}`}
                        >
              F/P: {badgeLabel(data.summary.value_for_money)}
            </span>
                    </div> */}

                    {data.request_id && (
                        <p className="text-[11px] text-muted-foreground">
                            Rapor Kodu: <code>{data.request_id}</code>
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
