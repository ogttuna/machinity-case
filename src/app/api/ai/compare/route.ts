// src/app/api/ai/compare/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { getProductById } from "@/lib/server/products-repo";
import type { Product } from "@/lib/schema";

/* 1) Girdi şeması: tam 2 adet ürün ID'si */
const BodySchema = z.object({
    productIds: z
        .array(z.string().min(1))
        .length(2, "Bu uç iki ürün karşılaştırır; tam 2 ID gönderin."),
});

/* 2) Ortak tipler (summarize ile hizalı) */
const MaxItemLen = 200;
const shortStr = z.string().max(400);
const lineStr = z.string().max(MaxItemLen);

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

const CompareResponseSchema = z.object({
    comparison: z.array(ProductSummaryItemSchema).length(2),
    summary: z.object({
        tldr: shortStr,
        value_for_money: z.enum(["poor", "average", "good", "excellent"]).default("average"),
    }),
    request_id: z.string().optional(),
});
type CompareResult = z.infer<typeof CompareResponseSchema>;

/* 3) LLM'e gidecek yalın item */
type LlmProduct = {
    id: string;
    name: string; // sadece gösterim; değerlendirme teknik alanlardan yapılır
    price: number | null;
    cpu: string | null;
    ram_gb: number | null;
    storage_gb: number | null;
    screen_inch: number | null;
    battery_wh: number | null;
    rating: number | null;
};
function pickForLLM(p: Product): LlmProduct {
    return {
        id: String(p.id),
        name: String(p.name),
        price: typeof p.price === "number" ? p.price : null,
        cpu: typeof p.cpu === "string" ? p.cpu : null,
        ram_gb: typeof p.ram_gb === "number" ? p.ram_gb : null,
        storage_gb: typeof p.storage_gb === "number" ? p.storage_gb : null,
        screen_inch: typeof p.screen_inch === "number" ? p.screen_inch : null,
        battery_wh: typeof p.battery_wh === "number" ? p.battery_wh : null,
        rating: typeof p.rating === "number" ? p.rating : null,
    };
}

/* 4) Katı JSON-only sistem prompt */
const SYSTEM_PROMPT = `
You are a JSON-only generator.

STRICT RULES:
- Output MUST be a single valid JSON object that matches the provided schema.
- No prose, no natural language, no markdown, no explanations.
- If you cannot produce valid JSON, return "{}".
- Do not add any commentary before or after the JSON.

Task:
Given TWO products' structured fields, produce a concise comparison:
- Return a "comparison" array with two items (one per product) including short pros/cons.
- Return a "summary.tldr" that highlights key trade-offs in max 280 chars.
- Evaluate ONLY using numeric/text fields (price/ram/storage/cpu/screen_inch/battery_wh/rating).
- NEVER base evaluation on the product "name" (display-only).
- IMPORTANT: Always include "name" for each item in "comparison". Set it exactly to the provided product.name. Never leave it empty.
`.trim();

function buildUserPrompt(a: LlmProduct, b: LlmProduct) {
    const schemaHint = {
        comparison: [
            {
                id: "string",
                name: "string (MUST be the provided product.name)",
                price: "number|null",
                cpu: "string|null",
                ram_gb: "number|null",
                storage_gb: "number|null",
                screen_inch: "number|null",
                battery_wh: "number|null",
                rating: "number|null",
                pros: ["short point (<=120 chars)", "... up to 5"],
                cons: ["short point (<=120 chars)", "... up to 5"],
            },
            {
                // second product: same shape
            },
        ],
        summary: {
            tldr: "max 280 chars",
            value_for_money: "poor|average|good|excellent",
        },
    };

    return `
Produce a single JSON object exactly matching this schema (no extra fields):

${JSON.stringify(schemaHint, null, 2)}

Notes:
- Evaluate using ONLY technical fields; ignore "name" for evaluation logic.
- For each comparison item, set "name" EXACTLY to the given product.name (do not infer, do not omit).
- Keep pros/cons factual and short (3–5 items if possible).

Products:
${JSON.stringify({ a, b }, null, 2)}
`.trim();
}

/* 5) Route */
export async function POST(req: Request) {
    const request_id = randomUUID();

    try {
        // 5.1) Body validation
        const bodyJson = await req.json().catch(() => ({}));
        const parsed = BodySchema.safeParse(bodyJson);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Geçersiz istek gövdesi.", details: parsed.error.flatten(), request_id },
                { status: 400 }
            );
        }

        const [idA, idB] = parsed.data.productIds;

        // 5.2) Ürünleri getir
        const [prodA, prodB] = await Promise.all([getProductById(idA), getProductById(idB)]);
        if (!prodA || !prodB) {
            return NextResponse.json(
                { error: "Ürün(ler) bulunamadı.", request_id },
                { status: 404 }
            );
        }

        const a = pickForLLM(prodA);
        const b = pickForLLM(prodB);

        // 5.3) Model çağrısı
        const content = await callOpenRouter({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: buildUserPrompt(a, b) },
            ],
            temperature: 0.1,
            maxTokens: 800,
        });

        // Teşhis için ham cevap logu
        console.log("[/api/ai/compare] LLM raw response:", content);

        // 5.4) JSON parse
        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(content);
        } catch {
            return NextResponse.json(
                { error: "Modelden geçersiz JSON döndü.", request_id },
                { status: 502 }
            );
        }

        // 5.5) Şema doğrulama
        const result = CompareResponseSchema.safeParse(parsedJson);
        if (!result.success) {
            return NextResponse.json(
                { error: "Çıktı şema doğrulamasından geçmedi.", details: result.error.flatten(), request_id },
                { status: 502 }
            );
        }

        // 5.6) Dön
        const payload: CompareResult = { request_id, ...result.data };
        return NextResponse.json(payload, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
        return NextResponse.json({ error: message, request_id }, { status: 500 });
    }
}
