// src/app/api/ai/parse-filters/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { getAllProducts } from "@/lib/server/products-repo";

/* -------------------- 1) Zod şeması -------------------- */
const RangeSchema = z
    .object({
        min: z.number().nullable().optional().default(null),
        max: z.number().nullable().optional().default(null),
        exact: z.number().nullable().optional().default(null),
    })
    .default({ min: null, max: null, exact: null });

const FilterSchema = z.object({
    categories: z.array(z.string()).default([]),
    brands: z.array(z.string()).default([]),

    // Esnek sayısal kriterler
    price: RangeSchema,
    ram_gb: RangeSchema,
    storage_gb: RangeSchema,
    screen_inch: RangeSchema,

    // Batarya & Ağırlık
    battery_wh: RangeSchema,
    weight_kg: RangeSchema,

    // ✅ CPU (discrete)
    cpus: z.array(z.string()).default([]),

    // FE ile uyum: "alphabetical" da desteklenir ve default budur
    sort: z
        .enum(["alphabetical", "price_asc", "price_desc", "rating_desc", "rating_asc"])
        .default("alphabetical"),
});
type ParsedFilters = z.infer<typeof FilterSchema>;

/* -------------------- Yardımcılar -------------------- */
function extractJson(text: string): string {
    // ```json ... ``` bloklarını veya ham JSON'u ayıkla
    const m = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (m) return m[1].trim();
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a !== -1 && b !== -1 && b > a) return text.slice(a, b + 1).trim();
    return text.trim();
}

/* -------------------- 2) Normalizasyon -------------------- */
function normalizeText(t: string) {
    let text = t.toLowerCase();

    // "30 bin", "30k"
    text = text.replace(/(\d+)\s*bin\b/gi, (_, n) => String(Number(n) * 1000));
    text = text.replace(/(\d+)\s*k\b/gi, (_, n) => String(Number(n) * 1000));

    // TR ondalık virgülünü noktaya çevir (15,6 -> 15.6)
    text = text.replace(/(\d+),(\d+)/g, "$1.$2");

    // 1.000 -> 1000 (binlik ayırıcıyı temizle)
    text = text.replace(/(\d{1,3})\.(\d{3})(?!\d)/g, "$1$2");

    // 500 g -> 0.5 kg
    text = text.replace(/(\d+(?:\.\d+)?)\s*g\b/gi, (_, n) => `${Number(n) / 1000} kg`);
    text = text.replace(/(\d+(?:\.\d+)?)\s*gram\b/gi, (_, n) => `${Number(n) / 1000} kg`);

    // 15" -> 15 inç
    text = text.replace(/(\d+(?:\.\d+)?)\s*"\b/g, "$1 inç");

    // mAh -> ÇEVİRME (bilinmeyen voltaj) YOK

    return text.trim();
}

/* -------------------- 3) Prompt -------------------- */
const SYSTEM_PARSE = `
Sadece GEÇERLİ JSON üret (markdown blokları, açıklama ekleme).
Görev: Kullanıcının Türkçe isteğini aşağıdaki şemaya göre filtre JSON’una çevir.

Şema:
{
  "categories": string[],
  "brands": string[],
  "price":       { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "ram_gb":      { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "storage_gb":  { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "screen_inch": { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "battery_wh":  { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "weight_kg":   { "min"?: number | null, "max"?: number | null, "exact"?: number | null },
  "cpus":        string[],
  "sort": "alphabetical" | "price_asc" | "price_desc" | "rating_desc" | "rating_asc"
}

Kurallar:
- Para ve GB/inç/kg/Wh birimlerini sayıya çevir (örn. "30 bin"→30000, "16gb"→16, "15.6 inç"→15.6, "2 kg"→2, "60 wh"→60).
- "altında", "en fazla", "≤" => ilgili alanda sadece "max" kullan.
- "üstünde", "en az", "≥"  => ilgili alanda sadece "min" kullan.
- "tam", "aynen", "="      => "exact" kullan (ve min=max=exact anlamına gelir).
- Kritik: "mAh" kapasitesini Wh’a çevirmeye çalışma; voltaj bilinmiyor → "battery_wh" alanını boş bırak.
- Sadece whitelist’teki kategori/marka/CPU değerlerini kullan; emin değilsen ilgili alanı boş array bırak.
- Bir sınır belirtilmediyse o alanı null bırak. KEYFİ TAHMİN YAPMA.
- JSON dışında hiçbir şey yazma.
`.trim();

// Modeli daha isabetli yönlendirmek için kısa örnekler:
const FEW_SHOTS = `
ÖRNEKLER:
1) "30 bin altı 16 GB ve üstü RAM'li laptoplar"
{
  "categories": ["laptop"],
  "brands": [],
  "price": { "min": null, "max": 30000, "exact": null },
  "ram_gb": { "min": 16, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": [],
  "sort": "price_asc"
}

2) "15.6 inç tam, 1.8 kg altı, 60 Wh üstü"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": 15.6 },
  "battery_wh": { "min": 60, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": 1.8, "exact": null },
  "cpus": [],
  "sort": "price_asc"
}

3) "512 GB depolama ve 16 GB ram"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": 16 },
  "storage_gb": { "min": null, "max": null, "exact": 512 },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": [],
  "sort": "price_asc"
}

4) "Fiyat önemli değil, en yüksek puanlıları göster"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": [],
  "sort": "rating_desc"
}

5) "puanı düşükten yükseğe sırala"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": [],
  "sort": "rating_asc"
}

6) "alfabetik sırala"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": [],
  "sort": "alphabetical"
}

7) "intel i7 ya da ryzen 7 olsun"
{
  "categories": [],
  "brands": [],
  "price": { "min": null, "max": null, "exact": null },
  "ram_gb": { "min": null, "max": null, "exact": null },
  "storage_gb": { "min": null, "max": null, "exact": null },
  "screen_inch": { "min": null, "max": null, "exact": null },
  "battery_wh": { "min": null, "max": null, "exact": null },
  "weight_kg": { "min": null, "max": null, "exact": null },
  "cpus": ["<whitelist'te nasıl geçiyorsa o şekilde>"],
  "sort": "alphabetical"
}
`.trim();

/* -------------------- Yardımcı: aralık düzeltme -------------------- */
function fixRange(
    r: ParsedFilters[keyof Pick<
        ParsedFilters,
        "price" | "ram_gb" | "storage_gb" | "screen_inch" | "battery_wh" | "weight_kg"
    >]
) {
    const out = { ...r };
    // Negatifleri sıfıra çek
    if (out.min != null && out.min < 0) out.min = 0;
    if (out.max != null && out.max < 0) out.max = 0;
    if (out.exact != null && out.exact < 0) out.exact = 0;

    // exact varsa min=max=exact
    if (out.exact != null) {
        out.min = out.exact;
        out.max = out.exact;
    }

    // min>max ise çevir
    if (out.min != null && out.max != null && out.min > out.max) {
        const t = out.min;
        out.min = out.max;
        out.max = t;
    }
    return out;
}

/* -------------------- 4) Route -------------------- */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const rawText = typeof body?.text === "string" ? body.text : "";

        if (!rawText.trim()) {
            return NextResponse.json(
                { error: "Body içinde 'text' alanı zorunludur." },
                { status: 400 }
            );
        }

        const cleaned = normalizeText(rawText);

        const items = await getAllProducts();
        const ALL_CATEGORIES = Array.from(new Set(items.map((p) => String(p.category)))).sort();
        const ALL_BRANDS = Array.from(new Set(items.map((p) => String(p.brand)))).sort();
        // ✅ CPU whitelist (kanonik isimler)
        const ALL_CPUS = Array.from(
            new Set(
                items
                    .map((p) => (typeof p.cpu === "string" ? p.cpu.trim() : ""))
                    .filter((s) => s.length > 0)
            )
        ).sort((a, b) => a.localeCompare(b, "tr", { sensitivity: "base", numeric: true }));

        const userPrompt = `
Kullanılabilir kategoriler: ${ALL_CATEGORIES.join(", ")}
Kullanılabilir markalar: ${ALL_BRANDS.join(", ")}
Kullanılabilir CPU'lar: ${ALL_CPUS.join(", ")}

${FEW_SHOTS}

Metin: """${cleaned}"""
Yalnızca şema ile UYUMLU, GEÇERLİ JSON üret:
`.trim();

        // Debug (gerekirse)
        console.log("[AI REQUEST] ----------------");
        console.log("System Prompt:", SYSTEM_PARSE);
        console.log("User Prompt:", userPrompt);

        const content = await callOpenRouter({
            messages: [
                { role: "system", content: SYSTEM_PARSE },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
        });

        console.log("[AI RESPONSE] ----------------");
        console.log(content);

        // Parse + validate
        let parsed: unknown = {};
        try {
            const jsonStr = extractJson(content);
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("[AI PARSE ERROR] Could not parse JSON from model response.");
        }

        const result = FilterSchema.safeParse(parsed);
        if (!result.success) {
            console.warn("[AI ZOD ERROR] invalid filter JSON:", result.error.flatten());
        }

        const data: ParsedFilters = result.success ? result.data : FilterSchema.parse({});

        // Whitelist uygula (kategori/marka)
        data.categories = data.categories.filter((c) => ALL_CATEGORIES.includes(c));
        data.brands = data.brands.filter((b) => ALL_BRANDS.includes(b));

        // ✅ Whitelist uygula (CPU) — case-insensitive kanonikleştirme
        if (Array.isArray(data.cpus) && data.cpus.length) {
            const canon = new Map(ALL_CPUS.map((c) => [c.toLowerCase(), c]));
            data.cpus = Array.from(
                new Set(
                    data.cpus
                        .map((c) => (typeof c === "string" ? c.trim() : ""))
                        .filter(Boolean)
                        .map((c) => canon.get(c.toLowerCase()))
                        .filter(Boolean) as string[]
                )
            );
        } else {
            data.cpus = [];
        }

        // Aralıkları düzelt
        data.price = fixRange(data.price);
        data.ram_gb = fixRange(data.ram_gb);
        data.storage_gb = fixRange(data.storage_gb);
        data.screen_inch = fixRange(data.screen_inch);
        data.battery_wh = fixRange(data.battery_wh);
        data.weight_kg = fixRange(data.weight_kg);

        return NextResponse.json(data);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
        console.error("[AI ERROR]", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
