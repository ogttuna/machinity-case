// src/lib/ai/openrouter.ts
// Server-side kullanım için ortak OpenRouter istemcisi + JSONL loglama.
// Not: Bu dosyayı yalnızca API route'ları / server actions içinden import edin.

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type CallOptions = {
    messages: ChatMessage[];
    model?: string;
    temperature?: number;
    maxTokens?: number;
    // Gerekirse ek alanlar: top_p, presence_penalty, frequency_penalty, vs.
};


const MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat-v3-0324:free";
const API_KEY = process.env.OPENROUTER_API_KEY;

async function logJsonl(kind: "request" | "response", payload: Record<string, unknown>) {
    try {
        const day = new Date().toISOString().slice(0, 10);
        const dir = join(process.cwd(), "ai-logs", day);
        await mkdir(dir, { recursive: true });
        const file = join(dir, `${Date.now()}-${randomUUID()}.jsonl`);
        const line = JSON.stringify(
            { ts: new Date().toISOString(), kind, ...payload },
            null,
            2 //Sırf güzel gözüksün diye
        );
        await writeFile(file, line + "\n");
    } catch {
        // Log hatalarını  yutuyalım; uygulama akışını bozulmasın.
    }
}



export async function callOpenRouter({
                                         messages,
                                         model = MODEL,
                                         temperature = 0.2,
                                         maxTokens,
                                     }: CallOptions): Promise<string> {
    if (!API_KEY) {
        throw new Error("OPENROUTER_API_KEY tanımlı değil. .env dosyanı kontrol et.");
    }

    await logJsonl("request", {
        model,
        temperature,
        maxTokens: maxTokens ?? null,
        messages,
    });

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
            // Referer ve Title, OpenRouter görünürlüğü ve iyi vatandaşlık için önerilir:
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Machinity AI Integration",
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        await logJsonl("response", { error: true, status: res.status, body: text });
        throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const data = await res.json();

    const reply: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.message ??
        "";

    await logJsonl("response", {
        model,
        reply,
    });

    return reply;
}
