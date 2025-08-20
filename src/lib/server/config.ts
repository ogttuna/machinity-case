// src/lib/server/config.ts
import { z } from "zod";

// env'i zod ile parse ediyorum; tip işi garanti. defaullt'lar tek yerde dursun.
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // isr süresi (sn). prod'da işe yarasın, dev'de zaten no-store var vs.
    REVALIDATE_SECONDS: z
        .string()
        .transform((v) => Number(v))
        .pipe(z.number().int().min(0).max(3600))
        .optional(),

    // ileride db'ye geçersek flag. şimdilik dursun, ayarlr kolay olsun
    USE_DB: z.enum(["true", "false"]).default("false"),
});

// process.env'yi parse et. yanlışsa uyar
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.warn("[config] env hatalı gibi:", parsed.error.flatten());
}

// final config obj. ts tipi temiz;
const env = parsed.success ? parsed.data : EnvSchema.parse({});

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const useDb = env.USE_DB === "true";

// revalidate: prod'da env varsa onu kullan, yoksa 60. dev/test'te 0 veriyorum; anlık gibi olsun.
export const revalidateSeconds = isProd ? env.REVALIDATE_SECONDS ?? 60 : 0;
