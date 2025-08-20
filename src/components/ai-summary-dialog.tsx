// src/components/ai-summary-dialog.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

/* ---------------- Zod şemaları -------------- */

const shortStr = z.string().max(400);
const lineStr = z.string().max(200);

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

const ResponseItemSchema = z.object({
    request_id: z.string().optional(),
    item: ProductSummaryItemSchema,
    summary: z.object({
        tldr: shortStr,
        value_for_money: z.enum(["poor", "average", "good", "excellent"]).default("average"),
    }),
});

const ResponseComparisonSchema = z.object({
    request_id: z.string().optional(),
    comparison: z.array(ProductSummaryItemSchema).min(1).max(4),
    summary: z.object({
        tldr: shortStr,
        value_for_money: z.enum(["poor", "average", "good", "excellent"]).default("average"),
    }),
});

type CanonicalResult = {
    request_id?: string;
    item: z.infer<typeof ProductSummaryItemSchema>;
    summary: {
        tldr: string;
        value_for_money: "poor" | "average" | "good" | "excellent";
    };
};

type Props = { productId: string; buttonSize?: "sm" | "default" | "lg" };

/* ------------ Yardımcılar ---------------- */

function fmtPrice(n: number | null) {
    return typeof n === "number" ? `${n.toLocaleString("tr-TR")} ₺` : "—";
}
function badgeLabel(v: CanonicalResult["summary"]["value_for_money"]) {
    return (
        {
            poor: "Zayıf",
            average: "Orta",
            good: "İyi",
            excellent: "Mükemmel",
        } as const
    )[v];
}

/* ---------------- Bileşen -------------- */

export function AiSummaryDialogTrigger({ productId, buttonSize = "lg" }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [data, setData] = useState<CanonicalResult | null>(null);
    const acRef = useRef<AbortController | null>(null);

    async function fetchSummary() {
        if (loading) return;

        setLoading(true);
        setErr(null);

        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        try {
            const res = await fetch("/api/ai/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                signal: ac.signal,
                body: JSON.stringify({ productIds: [productId] }),
            });

            const json: unknown = await res.json();

            if (!res.ok) {
                type ErrorResponse = { error: string };
                const msg =
                    (json && typeof json === "object" && "error" in json
                        ? (json as ErrorResponse).error
                        : `HTTP ${res.status}`);
                throw new Error(msg);
            }

            const single = ResponseItemSchema.safeParse(json);
            let normalized: CanonicalResult | null = null;

            if (single.success) {
                normalized = {
                    request_id: single.data.request_id,
                    item: single.data.item,
                    summary: single.data.summary,
                };
            } else {
                const multi = ResponseComparisonSchema.safeParse(json);
                if (multi.success) {
                    normalized = {
                        request_id: multi.data.request_id,
                        item: multi.data.comparison[0],
                        summary: multi.data.summary,
                    };
                }
            }

            if (!normalized) {
                throw new Error("Yanıt şemaya uymuyor.");
            }

            setData(normalized);
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === "AbortError") return;
            if (e instanceof Error) {
                setErr(e.message);
            } else {
                setErr("Bir şeyler ters gitti.");
            }
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open) {
            fetchSummary();
        } else {
            acRef.current?.abort();
            setErr(null);
            setData(null);
            setLoading(false);
        }
    }, [open]);

    const item = useMemo(() => data?.item ?? null, [data]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={buttonSize} variant="secondary" aria-haspopup="dialog" aria-expanded={open}>
                    AI Özetini Getir
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>AI Ürün Özeti</DialogTitle>
                    <DialogDescription>
                        Değerlendirme ürün <strong>özelliklerine</strong> dayanır; isim dikkate alınmaz.
                    </DialogDescription>
                </DialogHeader>

                {loading && <div className="py-8 text-sm text-muted-foreground">Özet hazırlanıyor…</div>}

                {!loading && err && (
                    <div className="space-y-3">
                        <p className="text-sm text-red-600">{err}</p>
                        <Button variant="outline" onClick={fetchSummary}>
                            Tekrar Dene
                        </Button>
                    </div>
                )}

                {!loading && !err && data && item && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm leading-relaxed">{data.summary.tldr}</p>
                            <span
                                className="inline-flex items-center rounded-full border px-3 py-1 text-xs"
                                aria-label={`Fiyat/Performans: ${badgeLabel(data.summary.value_for_money)}`}
                                title="Fiyat/Performans"
                            >
                                F/P: {badgeLabel(data.summary.value_for_money)}
                            </span>
                        </div>

                        <Separator />

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <h3 className="mb-2 text-sm font-semibold">Artılar</h3>
                                {item.pros.length ? (
                                    <ul className="list-disc pl-5 text-sm">
                                        {item.pros.map((p, i) => (
                                            <li key={`pro-${i}`}>{p}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>

                            <div className="rounded-lg border p-4">
                                <h3 className="mb-2 text-sm font-semibold">Eksiler</h3>
                                {item.cons.length ? (
                                    <ul className="list-disc pl-5 text-sm">
                                        {item.cons.map((c, i) => (
                                            <li key={`con-${i}`}>{c}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">—</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <h3 className="mb-2 text-sm font-semibold">Teknik Özellik Özeti</h3>
                            <dl className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <dt className="text-muted-foreground">Fiyat</dt>
                                    <dd>{fmtPrice(item.price)}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">CPU</dt>
                                    <dd>{item.cpu ?? "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">RAM</dt>
                                    <dd>{item.ram_gb != null ? `${item.ram_gb} GB` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Depolama</dt>
                                    <dd>{item.storage_gb != null ? `${item.storage_gb} GB` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Ekran</dt>
                                    <dd>{item.screen_inch != null ? `${item.screen_inch}"` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Batarya</dt>
                                    <dd>{item.battery_wh != null ? `${item.battery_wh} Wh` : "—"}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Puan</dt>
                                    <dd>{item.rating != null ? item.rating : "—"}</dd>
                                </div>
                            </dl>
                        </div>

                        {data.request_id && (
                            <p className="text-[11px] text-muted-foreground">
                                Rapor Kodu: <code>{data.request_id}</code>
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
