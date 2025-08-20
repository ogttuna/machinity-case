// lib/schema.ts
import { z } from "zod";

export const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(), // şimdilik string; sonra enum a çeksem daha iyi aslıdna
    brand: z.string(),
    price: z.number().nonnegative(),

    rating: z.number().min(0).max(5).nullable().optional(),
    weight_kg: z.number().nullable().optional(),
    cpu: z.string().nullable().optional(),

    // bunlar zaten nul olabiliyo
    ram_gb: z.number().int().nullable().optional(),
    storage_gb: z.number().int().nullable().optional(),
    battery_wh: z.number().nullable().optional(),

    //  Bunlar da nul olabilsin hadi
    screen_inch: z.number().nullable().optional(),
    image_url: z.string().nullable().optional(),
});

export const ProductsSchema = z.array(ProductSchema);
export type Product = z.infer<typeof ProductSchema>;
