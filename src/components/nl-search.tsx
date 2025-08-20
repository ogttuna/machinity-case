// components/nl-search.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFilters, type AIParsedFilters } from "@/state/useFilters";

// Basit API hata tipi + type guard dursun şöyle tam emin olamadım
type ApiError = { error: string };
function isApiError(x: unknown): x is ApiError {
    return (
        typeof x === "object" &&
        x !== null &&
        "error" in x &&
        typeof (x as Record<string, unknown>).error === "string"
    );
}

export function NLSearch() {
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const applyFromAI = useFilters((s) => s.applyFromAI);

    // Aynı anda birden fazla istek varsa yenisini başlatırken eskisini iptal etmek için
    const acRef = useRef<AbortController | null>(null);

    useEffect(() => {
        // unmount olduğunda devam eden istek varsa iptal et
        return () => acRef.current?.abort();
    }, []);

    async function run() {
        const text = q.trim();
        if (!text || loading) return;

        setLoading(true);
        setErr(null);

        // Eski isteği iptal et
        acRef.current?.abort();
        const ac = new AbortController();
        acRef.current = ac;

        try {
            const r = await fetch("/api/ai/parse-filters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
                signal: ac.signal,
                body: JSON.stringify({ text }),
            });

            const data: unknown = await r.json();

            if (!r.ok) {
                const msg = isApiError(data) ? data.error : `HTTP ${r.status}`;
                throw new Error(msg);
            }

            if (isApiError(data)) {
                throw new Error(data.error);
            }

            //  Tek hamlede AI filtrelerini uygula
            applyFromAI(data as AIParsedFilters);

            setQ("");
        } catch (e: unknown) {
            // Abort edilmiş istekler yutsun
            if (e instanceof DOMException && e.name === "AbortError") return;

            const message = e instanceof Error ? e.message : "Bir şeyler ters gitti.";
            setErr(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                run();
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
            <div className="flex w-full items-center gap-2">
                <input

                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setQ("");
                    }}
                    placeholder='Örn: "16 GB RAM’li, 30 bin TL altındaki laptoplar"'
                    className="w-full min-w-[22rem] rounded-md border px-3 py-2 text-sm outline-none focus:border-primary"

                    aria-label="Doğal dil arama"
                    autoComplete="off"
                />
                <button
                    type="submit"
                    disabled={loading || !q.trim()}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
                >
                    {loading ? "Uygulanıyor…" : "Uygula"}
                </button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
        </form>
    );
}
