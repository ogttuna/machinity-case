// src/app/api/ai/summarize/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { getProductById } from "@/lib/server/products-repo";
import type { Product } from "@/lib/schema";

/* ------------------------------------------
 * 1) Girdi şeması: productIds (tam 1 adet)
 * ------------------------------------------ */
const BodySchema = z.object({
    productIds: z
        .array(z.string().min(1))
        .length(1, "Bu uç tek ürün özeti üretir; tam 1 ID gönderin."),
});

/* -------------------------------------------------------
 * 2) Çıktı şeması: TEK ürün özeti (render-dostu)
 * ------------------------------------------------------- */
const MaxItemLen = 120;
const shortStr = z.string().max(MaxItemLen);

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
    pros: z.array(shortStr).max(5).default([]),
    cons: z.array(shortStr).max(5).default([]),
});

const SummarySchema = z.object({
    item: ProductSummaryItemSchema, // ← tek ürün
    summary: z.object({
        tldr: z.string().max(280),
        value_for_money: z.enum(["poor", "average", "good", "excellent"]).default("average"),
    }),
});
type SummaryResult = z.infer<typeof SummarySchema>;

/* ---------------------------------------------
 * 3) LLM'e gönderilecek yalın ve güvenli payload
 * --------------------------------------------- */
type LlmProduct = {
    id: string;
    name: string;             // sadece gösterim; değerlendirmede kullanılmayacak
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

/* ---------------------------------------
 * 4) Sert JSON-only sistem prompt
 * --------------------------------------- */
const SYSTEM_PROMPT = `
You are a JSON-only generator.

STRICT RULES:
- Output MUST be a single valid JSON object that matches the provided schema.
- No prose, no natural language, no markdown, no explanations.
- If you cannot produce valid JSON, return "{}".
- Do not add any commentary before or after the JSON.

Task:
Given ONE product's structured fields, create a concise technical summary.
Evaluate ONLY using numeric/text fields (price/ram/storage/cpu/screen_inch/battery_wh/rating).
NEVER base the evaluation on the product "name" (it's display-only).
`.trim();

function buildUserPrompt(item: LlmProduct) {
    // Şemayı kullanıcı prompt içinde de net belirtiyoruz
    const schemaHint = {
        item: {
            id: "string",
            name: "string",
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
- Keep pros/cons factual and short (no fluff, 3–5 total across each list if possible).

Product:
${JSON.stringify(item, null, 2)}
`.trim();
}

/* -----------
 * 5) Route
 * ----------- */
export async function POST(req: Request) {
    const request_id = randomUUID();

    try {
        // 5.1) Girdi doğrulama
        const bodyJson = await req.json().catch(() => ({}));
        const parsed = BodySchema.safeParse(bodyJson);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Geçersiz istek gövdesi.", details: parsed.error.flatten(), request_id },
                { status: 400 }
            );
        }

        const [onlyId] = parsed.data.productIds;
        const product = await getProductById(onlyId);

        if (!product) {
            return NextResponse.json(
                { error: "Ürün bulunamadı.", request_id },
                { status: 404 }
            );
        }

        const compact = pickForLLM(product);

        // 5.2) Model çağrısı
        const content = await callOpenRouter({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: buildUserPrompt(compact) },
            ],
            temperature: 0.1,
            maxTokens: 600,
        });

        // ham model cevabını logla (geçersizse teşhis için)
        console.log("[/api/ai/summarize] LLM raw response:", content);

        // 5.3) JSON parse
        let parsedJson: unknown;
        try {
            parsedJson = JSON.parse(content);
        } catch {
            return NextResponse.json(
                { error: "Modelden geçersiz JSON döndü.", request_id },
                { status: 502 }
            );
        }

        // 5.4) Şema doğrulama
        const result = SummarySchema.safeParse(parsedJson);
        if (!result.success) {
            return NextResponse.json(
                { error: "Çıktı şema doğrulamasından geçmedi.", details: result.error.flatten(), request_id },
                { status: 502 }
            );
        }

        // 5.5) Dön
        const payload: SummaryResult = result.data;
        return NextResponse.json({ request_id, ...payload }, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
        return NextResponse.json({ error: message, request_id }, { status: 500 });
    }
}
